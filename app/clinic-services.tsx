import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Checkbox, HelperText, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompactScreenHeader } from '@/components/ui/CompactScreenHeader';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, spacing } from '@/constants';
import { colors } from '@/constants/Colors';
import {
  CLINIC_SETUP_AVAILABLE_SERVICES_QUERY_KEY,
  useClinicSetupAvailableServicesQuery,
} from '@/hooks/useClinicSetupAvailableServicesQuery';
import {
  CLINIC_SETUP_MY_SERVICES_QUERY_KEY,
  useClinicSetupMyServicesQuery,
} from '@/hooks/useClinicSetupMyServicesQuery';
import { useAppToast } from '@/hooks/useAppToast';
import { saveClinicSetupServices } from '@/services/clinicSetupServicesService';
import { useAuthStore } from '@/store';

function formatPriceForField(p: number): string {
  if (!Number.isFinite(p)) return '0';
  if (Math.round(p) === p) return String(Math.round(p));
  return String(p);
}

function parsePriceInput(raw: string | undefined): number {
  const t = String(raw ?? '').trim().replace(',', '.');
  if (t === '') return 0;
  const n = parseFloat(t);
  return Number.isFinite(n) ? Math.max(0, n) : NaN;
}

export default function ClinicServicesScreen() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppToast();

  const servicesQuery = useClinicSetupAvailableServicesQuery({
    enabled: Boolean(token),
  });

  const myServicesQuery = useClinicSetupMyServicesQuery({
    enabled: Boolean(token),
  });

  const catalog = servicesQuery.data?.items ?? [];
  const catalogKey =
    servicesQuery.data?.items?.map((i) => i.id).join(',') ?? '';
  const apiHint = servicesQuery.data?.message ?? null;

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [prices, setPrices] = useState<Record<number, string>>({});
  /** Bumped on screen focus and after save so checkboxes match server-mapped services. */
  const [syncGeneration, setSyncGeneration] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      setSyncGeneration((g) => g + 1);
    }, [token]),
  );

  useEffect(() => {
    if (!servicesQuery.isSuccess) return;
    // First load: wait until my-services has finished its initial request (success or error).
    const myStillLoadingFirst =
      Boolean(token) &&
      !myServicesQuery.isFetched &&
      (myServicesQuery.isPending || myServicesQuery.isFetching);
    if (myStillLoadingFirst) return;

    const items = servicesQuery.data?.items ?? [];
    const myRows = Array.isArray(myServicesQuery.data)
      ? myServicesQuery.data
      : [];

    const mappedIds = new Set<number>();
    for (const r of myRows) {
      if (
        Number.isFinite(r.treatment_category_id) &&
        r.treatment_category_id > 0
      ) {
        mappedIds.add(r.treatment_category_id);
      }
    }
    for (const c of items) {
      if (c.isMapped) mappedIds.add(c.id);
    }

    const sel = items
      .filter((c) => mappedIds.has(c.id))
      .map((c) => c.id);
    const pr: Record<number, string> = {};
    for (const c of items) {
      const m = myRows.find((r) => r.treatment_category_id === c.id);
      pr[c.id] = m != null ? formatPriceForField(m.price) : '0';
    }

    setSelectedIds(sel);
    setPrices(pr);
  }, [
    syncGeneration,
    token,
    servicesQuery.isSuccess,
    servicesQuery.data?.items,
    catalogKey,
    myServicesQuery.isFetched,
    myServicesQuery.isPending,
    myServicesQuery.isFetching,
    myServicesQuery.data,
  ]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = selectedIds.map((id) => ({
        treatment_category_id: id,
        price: parsePriceInput(prices[id]),
      }));
      const bad = payload.some((p) => Number.isNaN(p.price));
      if (bad) {
        return Promise.reject(new Error('Enter a valid price (0 or more) for each selected service.'));
      }
      return saveClinicSetupServices(payload);
    },
    onSuccess: async (result) => {
      showSuccess(result.message ?? 'Services saved successfully.');
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: [...CLINIC_SETUP_AVAILABLE_SERVICES_QUERY_KEY],
        }),
        queryClient.refetchQueries({
          queryKey: [...CLINIC_SETUP_MY_SERVICES_QUERY_KEY],
        }),
      ]);
      setSyncGeneration((g) => g + 1);
    },
    onError: (err: unknown) => {
      showError(
        err instanceof Error ? err.message : 'Could not save services.',
      );
    },
  });

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      if (!prev.includes(id)) {
        setPrices((p) => ({
          ...p,
          [id]: p[id] != null && String(p[id]).trim() !== '' ? p[id]! : '0',
        }));
      }
      return next;
    });
  }

  const invalidSelectedPrice =
    selectedIds.length > 0 &&
    selectedIds.some((id) => Number.isNaN(parsePriceInput(prices[id])));

  const canSave =
    Boolean(token) &&
    servicesQuery.isSuccess &&
    catalog.length > 0 &&
    selectedIds.length > 0 &&
    !invalidSelectedPrice &&
    !saveMutation.isPending;

  /** True while waiting for the first GET my-services result (for list + checkboxes). Kept for clarity / older bundles. */
  const needsServerSync =
    Boolean(token) &&
    servicesQuery.isSuccess &&
    catalog.length > 0 &&
    !myServicesQuery.isFetched &&
    (myServicesQuery.isPending || myServicesQuery.isFetching);

  const showListSkeleton = needsServerSync;

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}>
            <CompactScreenHeader title="Services" />

            <View style={styles.card}>
              <Text variant="bodyMedium" style={styles.lead}>
                {apiHint ??
                  'Select the services your clinic offers, set a price for each, then save.'}
              </Text>

              {!token ? (
                <HelperText type="error" visible>
                  Sign in to manage clinic services.
                </HelperText>
              ) : null}

              {servicesQuery.isPending ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={colors.primary} />
                  <Text variant="bodySmall" style={styles.muted}>
                    Loading services…
                  </Text>
                </View>
              ) : null}

              {servicesQuery.isError ? (
                <>
                  <HelperText type="error" visible style={styles.err}>
                    {servicesQuery.error instanceof Error
                      ? servicesQuery.error.message
                      : 'Could not load services.'}
                  </HelperText>
                  <Button
                    mode="outlined"
                    onPress={() => void servicesQuery.refetch()}
                    disabled={servicesQuery.isFetching}>
                    Retry
                  </Button>
                </>
              ) : null}

              {token && myServicesQuery.isError ? (
                <HelperText type="error" visible style={styles.err}>
                  {myServicesQuery.error instanceof Error
                    ? myServicesQuery.error.message
                    : 'Could not load your saved services.'}
                </HelperText>
              ) : null}

              {servicesQuery.isSuccess && catalog.length === 0 ? (
                <Text variant="bodyMedium" style={styles.muted}>
                  No services Found
                </Text>
              ) : null}

              {servicesQuery.isSuccess && catalog.length > 0 ? (
                <>
                  {showListSkeleton ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color={colors.primary} />
                      <Text variant="bodySmall" style={styles.muted}>
                        Loading your selections…
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.list}>
                        {catalog.map((s) => {
                          const checked = selectedIds.includes(s.id);
                          return (
                            <View key={s.id} style={styles.row}>
                              <Pressable
                                onPress={() => toggle(s.id)}
                                disabled={saveMutation.isPending}
                                style={({ pressed }) => [
                                  styles.rowCheck,
                                  pressed && styles.rowPressed,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={
                                  checked ? 'Deselect service' : 'Select service'
                                }>
                                <Checkbox.Android
                                  status={checked ? 'checked' : 'unchecked'}
                                  color={colors.primary}
                                  disabled={saveMutation.isPending}
                                  pointerEvents="none"
                                  accessibilityState={{ checked }}
                                />
                              </Pressable>
                              <Pressable
                                onPress={() => toggle(s.id)}
                                disabled={saveMutation.isPending}
                                style={({ pressed }) => [
                                  styles.rowBody,
                                  pressed && styles.rowPressed,
                                ]}
                                accessibilityRole="button">
                                <Text variant="bodyMedium" style={styles.name}>
                                  {s.name}
                                </Text>
                                {s.slug ? (
                                  <Text variant="bodySmall" style={styles.slug}>
                                    {s.slug}
                                  </Text>
                                ) : null}
                                {s.description ? (
                                  <Text
                                    variant="bodySmall"
                                    style={styles.desc}
                                    numberOfLines={5}>
                                    {s.description}
                                  </Text>
                                ) : null}
                              </Pressable>
                              <TextInput
                                mode="outlined"
                                dense
                                disabled={!checked || saveMutation.isPending}
                                keyboardType="decimal-pad"
                                placeholder="0"
                                value={prices[s.id] ?? ''}
                                onChangeText={(t) =>
                                  setPrices((prev) => ({ ...prev, [s.id]: t }))
                                }
                                style={styles.priceInput}
                                contentStyle={styles.priceInputContent}
                              />
                            </View>
                          );
                        })}
                      </View>
                      <HelperText type="info" visible style={styles.count}>
                        {selectedIds.length} of {catalog.length} selected
                      </HelperText>
                      {invalidSelectedPrice ? (
                        <HelperText type="error" visible>
                          Enter a valid price (0 or more) for each selected service.
                        </HelperText>
                      ) : null}
                      <Button
                        mode="contained"
                        onPress={() => saveMutation.mutate()}
                        loading={saveMutation.isPending}
                        disabled={!canSave}
                        buttonColor={colors.secondary}
                        textColor={colors.onPrimary}
                        style={[clinicScreen.button, styles.saveBtn]}
                        contentStyle={clinicScreen.buttonContent}>
                        Save services
                      </Button>
                    </>
                  )}
                </>
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <LoadingOverlay
        visible={saveMutation.isPending}
        message="Saving services…"
      />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { paddingBottom: spacing.xl },
  card: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lead: {
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  muted: { color: colors.textMuted },
  err: { marginBottom: spacing.sm },
  list: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  rowCheck: {
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  rowPressed: { opacity: 0.85 },
  rowBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  name: { fontWeight: '600', color: colors.secondary },
  slug: {
    color: colors.textMuted,
    marginTop: 2,
    fontSize: 12,
  },
  desc: { color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  priceInput: {
    width: 96,
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
  },
  priceInputContent: {
    fontSize: 14,
    textAlign: 'right',
  },
  count: { marginBottom: spacing.sm },
  saveBtn: { marginTop: spacing.xs },
  saveHint: { marginTop: spacing.sm },
});
