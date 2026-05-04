import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  Card,
  Dialog,
  HelperText,
  Portal,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompactScreenHeader } from '@/components/ui/CompactScreenHeader';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { useAppToast } from '@/hooks/useAppToast';
import { useClinicTimingsApiQuery } from '@/hooks/useClinicTimingsApiQuery';
import {
  useMarkClinicTimingLeaveMutation,
  useRemoveClinicTimingLeaveMutation,
  useSaveClinicTimingsBulkMutation,
} from '@/hooks/useClinicTimingsMutations';
import {
  apiTimeToHi,
  hiToApiTime,
  type ClinicTimingsApiRow,
  type ClinicTimingBulkSaveRow,
} from '@/services/clinicTimingService';
import { useAuthStore } from '@/store';

type DraftRow = {
  day: string;
  opensHi: string;
  closesHi: string;
  is_closed: boolean;
  is_open_now: boolean;
};

function formatDayLabel(day: string): string {
  const d = day.trim().toLowerCase();
  if (!d) return day;
  return d.charAt(0).toUpperCase() + d.slice(1);
}

function apiRowsToDraft(rows: ClinicTimingsApiRow[]): DraftRow[] {
  return rows.map((r) => ({
    day: r.day,
    opensHi: apiTimeToHi(r.opens_at),
    closesHi: apiTimeToHi(r.closes_at),
    is_closed: r.is_closed,
    is_open_now: r.is_open_now,
  }));
}

function draftToBulk(draft: DraftRow[]): ClinicTimingBulkSaveRow[] {
  return draft.map((d) => ({
    day: d.day,
    opens_at: d.is_closed ? null : d.opensHi,
    closes_at: d.is_closed ? null : d.closesHi,
    is_closed: d.is_closed,
  }));
}

function rowTimesValid(r: DraftRow): boolean {
  if (r.is_closed) return true;
  return hiToApiTime(r.opensHi) != null && hiToApiTime(r.closesHi) != null;
}

export default function ClinicTimingsScreen() {
  const token = useAuthStore((s) => s.token);
  const { showSuccess, showError } = useAppToast();

  const timingsQuery = useClinicTimingsApiQuery({ enabled: Boolean(token) });
  const saveBulk = useSaveClinicTimingsBulkMutation();
  const markLeave = useMarkClinicTimingLeaveMutation();
  const removeLeave = useRemoveClinicTimingLeaveMutation();

  const [draft, setDraft] = useState<DraftRow[] | null>(null);
  const [reopenDay, setReopenDay] = useState<string | null>(null);
  const [reopenOpen, setReopenOpen] = useState('09:00');
  const [reopenClose, setReopenClose] = useState('18:00');

  useEffect(() => {
    if (timingsQuery.isSuccess && timingsQuery.data?.length) {
      setDraft(apiRowsToDraft(timingsQuery.data));
    }
  }, [timingsQuery.dataUpdatedAt, timingsQuery.isSuccess, timingsQuery.data]);

  const updateRow = useCallback((day: string, patch: Partial<DraftRow>) => {
    setDraft((prev) =>
      prev?.map((r) => (r.day === day ? { ...r, ...patch } : r)) ?? prev,
    );
  }, []);

  const canSaveWeek =
    Boolean(token) &&
    draft != null &&
    draft.length > 0 &&
    draft.every(rowTimesValid) &&
    !saveBulk.isPending;

  function onSaveWeek() {
    if (!draft?.length) return;
    if (!draft.every(rowTimesValid)) {
      showError('For open days, enter valid times as HH:mm (e.g. 09:00).');
      return;
    }
    saveBulk.mutate(draftToBulk(draft), {
      onSuccess: () => {
        showSuccess('Weekly timings saved.');
        router.back();
      },
      onError: (e) => {
        showError(e instanceof Error ? e.message : 'Could not save timings.');
      },
    });
  }

  function onMarkLeave(day: string) {
    markLeave.mutate(day, {
      onSuccess: (msg) => {
        showSuccess(msg);
      },
      onError: (e) => {
        showError(e instanceof Error ? e.message : 'Could not mark leave.');
      },
    });
  }

  function openReopenDialog(day: string, row: DraftRow) {
    setReopenDay(day);
    setReopenOpen(row.opensHi || '09:00');
    setReopenClose(row.closesHi || '18:00');
  }

  function confirmReopen() {
    if (!reopenDay) return;
    if (!hiToApiTime(reopenOpen) || !hiToApiTime(reopenClose)) {
      showError('Use HH:mm for open and close times.');
      return;
    }
    removeLeave.mutate(
      { day: reopenDay, opensAt: reopenOpen, closesAt: reopenClose },
      {
        onSuccess: (msg) => {
          showSuccess(msg);
          setReopenDay(null);
        },
        onError: (e) => {
          showError(e instanceof Error ? e.message : 'Could not reopen day.');
        },
      },
    );
  }

  const busy =
    saveBulk.isPending || markLeave.isPending || removeLeave.isPending;

  const listRefreshing =
    timingsQuery.isRefetching && !timingsQuery.isFetching;

  const invalidRows = useMemo(() => {
    if (!draft) return [] as string[];
    return draft.filter((r) => !rowTimesValid(r)).map((r) => r.day);
  }, [draft]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <CompactScreenHeader title="Weekly timings" />

      {!token ? (
        <View style={[clinicScreen.screenPadding, styles.padTop]}>
          <HelperText type="error" visible>
            Sign in as a clinic user to manage timings.
          </HelperText>
        </View>
      ) : null}

      {token ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={listRefreshing}
                onRefresh={() => void timingsQuery.refetch()}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}>
            <Text variant="bodyMedium" style={styles.intro}>
              Edit hours per day, mark leave for a single day, or reopen a closed
              day with new hours. Tap Save week to POST /clinic/timings.
            </Text>

            {timingsQuery.isError ? (
              <Card style={[clinicScreen.card, styles.card]} mode="outlined">
                <Card.Content>
                  <Text style={styles.errorText}>
                    {timingsQuery.error instanceof Error
                      ? timingsQuery.error.message
                      : 'Could not load timings.'}
                  </Text>
                  <Button
                    mode="contained"
                    onPress={() => void timingsQuery.refetch()}
                    style={styles.retry}>
                    Retry
                  </Button>
                </Card.Content>
              </Card>
            ) : null}

            {timingsQuery.isPending && !draft?.length ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.primary} />
                <Text variant="bodySmall" style={styles.muted}>
                  Loading schedule…
                </Text>
              </View>
            ) : null}

            {draft?.map((row) => (
              <Card
                key={row.day}
                style={[clinicScreen.card, styles.card]}
                mode="elevated">
                <Card.Content>
                  <View style={styles.dayHeader}>
                    <Text variant="titleMedium" style={styles.dayTitle}>
                      {formatDayLabel(row.day)}
                    </Text>
                    {row.is_open_now ? (
                      <Text style={styles.openNowBadge}>Open now</Text>
                    ) : (
                      <Text style={styles.closedNowBadge}>Not open now</Text>
                    )}
                  </View>

                  <View style={styles.switchRow}>
                    <Text variant="bodyMedium" style={styles.switchLabel}>
                      Closed / leave
                    </Text>
                    <Switch
                      value={row.is_closed}
                      onValueChange={(v) =>
                        updateRow(row.day, { is_closed: v })
                      }
                      disabled={busy}
                      color={colors.primary}
                    />
                  </View>
                  <HelperText type="info" visible style={styles.hint}>
                    When on, this day has no visiting hours until you reopen or
                    save new hours.
                  </HelperText>

                  <TextInput
                    label="Opens at"
                    value={row.opensHi}
                    onChangeText={(t) => updateRow(row.day, { opensHi: t })}
                    mode="outlined"
                    placeholder="09:00"
                    keyboardType="numbers-and-punctuation"
                    disabled={row.is_closed || busy}
                    style={styles.input}
                    dense
                  />
                  <TextInput
                    label="Closes at"
                    value={row.closesHi}
                    onChangeText={(t) => updateRow(row.day, { closesHi: t })}
                    mode="outlined"
                    placeholder="18:00"
                    keyboardType="numbers-and-punctuation"
                    disabled={row.is_closed || busy}
                    style={styles.input}
                    dense
                  />
                  {!row.is_closed && !rowTimesValid(row) ? (
                    <HelperText type="error" visible>
                      Use HH:mm (24h) for both fields.
                    </HelperText>
                  ) : null}

                  <View style={styles.actions}>
                    {!row.is_closed ? (
                      <Button
                        mode="outlined"
                        compact
                        onPress={() => onMarkLeave(row.day)}
                        loading={markLeave.isPending}
                        disabled={busy}>
                        Mark leave
                      </Button>
                    ) : (
                      <Button
                        mode="outlined"
                        compact
                        onPress={() => openReopenDialog(row.day, row)}
                        disabled={busy}>
                        Set hours & reopen
                      </Button>
                    )}
                  </View>
                </Card.Content>
              </Card>
            ))}

            {draft?.length ? (
              <>
                {invalidRows.length > 0 ? (
                  <HelperText type="error" visible>
                    Fix times for:{' '}
                    {invalidRows.map(formatDayLabel).join(', ')}
                  </HelperText>
                ) : null}
                <Button
                  mode="contained"
                  onPress={onSaveWeek}
                  loading={saveBulk.isPending}
                  disabled={!canSaveWeek}
                  buttonColor={colors.secondary}
                  textColor={colors.onPrimary}
                  style={[clinicScreen.button, styles.saveBtn]}
                  contentStyle={clinicScreen.buttonContent}>
                  Save week
                </Button>
                <Pressable
                  onPress={() => router.back()}
                  style={styles.backTextWrap}>
                  <Text style={styles.backText}>Back to settings</Text>
                </Pressable>
              </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : null}

      <Portal>
        <Dialog
          visible={reopenDay != null}
          onDismiss={() => !removeLeave.isPending && setReopenDay(null)}>
          <Dialog.Title>
            Reopen {reopenDay ? formatDayLabel(reopenDay) : ''}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={styles.muted}>
              POST /clinic/timings/remove-leave requires open and close times
              (HH:mm).
            </Text>
            <TextInput
              label="Opens at"
              value={reopenOpen}
              onChangeText={setReopenOpen}
              mode="outlined"
              style={styles.dialogInput}
              keyboardType="numbers-and-punctuation"
            />
            <TextInput
              label="Closes at"
              value={reopenClose}
              onChangeText={setReopenClose}
              mode="outlined"
              style={styles.dialogInput}
              keyboardType="numbers-and-punctuation"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setReopenDay(null)} disabled={removeLeave.isPending}>
              Cancel
            </Button>
            <Button onPress={confirmReopen} loading={removeLeave.isPending}>
              Reopen
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <LoadingOverlay visible={busy} message="Updating timings…" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  padTop: { paddingTop: spacing.sm },
  scroll: { paddingBottom: spacing.xxl },
  intro: {
    ...typography.subtitle,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  card: { marginBottom: spacing.md },
  loading: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  muted: { color: colors.textMuted },
  errorText: { color: colors.error, marginBottom: spacing.sm },
  retry: { alignSelf: 'flex-start' },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  dayTitle: { fontWeight: '800', color: colors.secondary, flex: 1 },
  openNowBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.success,
    textTransform: 'uppercase',
  },
  closedNowBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  switchLabel: { flex: 1, paddingRight: spacing.md },
  hint: { marginBottom: spacing.sm },
  input: { marginBottom: spacing.sm, backgroundColor: colors.surface },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  saveBtn: { marginTop: spacing.md },
  backTextWrap: { marginTop: spacing.lg, alignSelf: 'center', padding: spacing.sm },
  backText: { color: colors.primary, fontWeight: '600' },
  dialogInput: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
  },
});
