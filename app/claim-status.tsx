import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  Card,
  Chip,
  HelperText,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompactScreenHeader } from '@/components/ui/CompactScreenHeader';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { useAppToast } from '@/hooks/useAppToast';
import { useClaimStatus } from '@/hooks/useClaimStatus';
import {
  CLAIM_APPROVED_DELIVERY_NOTE,
  CLAIM_LIFECYCLE_LABELS,
  CLAIM_STATUS_TRACKING_NOTE,
  type ClaimLifecycleStatus,
} from '@/services/claimService';

const STATUS_ORDER: ClaimLifecycleStatus[] = [
  'submitted',
  'verifying',
  'approved',
  'rejected',
];

function paramClaimId(
  raw: string | string[] | undefined,
): string | undefined {
  if (raw == null) return undefined;
  const v = Array.isArray(raw) ? raw[0] : raw;
  const t = v?.trim();
  return t ? t : undefined;
}

function chipStyle(
  key: ClaimLifecycleStatus,
  current: ClaimLifecycleStatus,
): object {
  const selected = key === current;
  if (!selected) {
    return {
      backgroundColor: colors.surfaceVariant,
      borderColor: colors.border,
    };
  }
  switch (key) {
    case 'submitted':
      return { backgroundColor: colors.surfaceVariant, borderColor: colors.primary };
    case 'verifying':
      return { backgroundColor: 'rgba(46, 189, 180, 0.18)', borderColor: colors.primary };
    case 'approved':
      return { backgroundColor: 'rgba(27, 122, 108, 0.2)', borderColor: colors.success };
    case 'rejected':
      return { backgroundColor: 'rgba(179, 38, 30, 0.12)', borderColor: colors.error };
    default:
      return {};
  }
}

function chipTextStyle(
  key: ClaimLifecycleStatus,
  current: ClaimLifecycleStatus,
): object {
  const selected = key === current;
  if (!selected) return { color: colors.textMuted };
  if (key === 'rejected') return { color: colors.error, fontWeight: '700' };
  if (key === 'approved') return { color: colors.success, fontWeight: '700' };
  return { color: colors.secondary, fontWeight: '700' };
}

export default function ClaimStatusScreen() {
  const params = useLocalSearchParams<{ claimId?: string | string[] }>();
  const paramId = useMemo(() => paramClaimId(params.claimId), [params.claimId]);

  const [inputId, setInputId] = useState(paramId ?? '');
  const [queryId, setQueryId] = useState<string | null>(paramId ?? null);

  useEffect(() => {
    if (paramId) {
      setInputId(paramId);
      setQueryId(paramId);
    }
  }, [paramId]);

  const statusQuery = useClaimStatus(queryId);
  const { showError, showSuccess } = useAppToast();
  const loadErrorToastShown = useRef(false);
  const loadSuccessToastKey = useRef<string | null>(null);

  const lifecycle: ClaimLifecycleStatus =
    statusQuery.data?.lifecycle ?? 'submitted';

  useEffect(() => {
    if (statusQuery.isError) {
      if (!loadErrorToastShown.current) {
        showError('Could not load claim status');
        loadErrorToastShown.current = true;
      }
    } else {
      loadErrorToastShown.current = false;
    }
  }, [statusQuery.isError, showError]);

  useEffect(() => {
    if (
      !queryId ||
      !statusQuery.isSuccess ||
      !statusQuery.data ||
      statusQuery.isFetching
    ) {
      return;
    }
    const key = `${queryId}-${String(statusQuery.dataUpdatedAt)}`;
    if (loadSuccessToastKey.current === key) return;
    loadSuccessToastKey.current = key;
    showSuccess('Claim status loaded.');
  }, [
    queryId,
    statusQuery.isSuccess,
    statusQuery.data,
    statusQuery.isFetching,
    statusQuery.dataUpdatedAt,
    showSuccess,
  ]);

  const onRefresh = useCallback(() => {
    void statusQuery.refetch();
  }, [statusQuery]);

  function onLoad() {
    const next = inputId.trim();
    if (!next) {
      setQueryId(null);
      return;
    }
    setQueryId(next);
  }

  const displayClaimId = statusQuery.data?.claimId ?? queryId ?? '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <CompactScreenHeader title="Claim status" />

      <ScrollView
        contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={statusQuery.isFetching}
            onRefresh={onRefresh}
            enabled={queryId != null && queryId.length > 0}
            tintColor={colors.primary}
          />
        }>
        <Text variant="bodyMedium" style={styles.intro}>
          Enter a claim ID to load the latest status from GET /claim-status.
        </Text>

        <Card style={[clinicScreen.card, styles.card]} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Look up claim
            </Text>
            <TextInput
              label="Claim ID"
              value={inputId}
              onChangeText={setInputId}
              mode="outlined"
              autoCapitalize="characters"
              placeholder="e.g. CLM123"
              style={styles.input}
              onSubmitEditing={() => {
                if (inputId.trim()) onLoad();
              }}
              returnKeyType="search"
              editable={!statusQuery.isFetching}
            />
            <Button
              mode="contained"
              onPress={onLoad}
              loading={statusQuery.isFetching && !!queryId}
              disabled={
                statusQuery.isFetching || !inputId.trim()
              }
              style={[clinicScreen.button, styles.loadBtn]}
              contentStyle={clinicScreen.buttonContent}>
              Load status
            </Button>
          </Card.Content>
        </Card>

        {queryId == null || queryId.length === 0 ? (
          <HelperText type="info" visible style={styles.hint}>
            Enter a claim ID above, then tap Load status.
          </HelperText>
        ) : statusQuery.isPending && !statusQuery.data ? null : statusQuery.isError ? (
          <Card style={[clinicScreen.card, styles.card]} mode="outlined">
            <Card.Content>
              <Text variant="bodyLarge" style={styles.error}>
                Could not load status
              </Text>
              <Text variant="bodyMedium" style={styles.muted}>
                Pull down to retry.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <>
            <Card style={[clinicScreen.card, styles.card]} mode="elevated">
              <Card.Content>
                <Text variant="labelLarge" style={styles.label}>
                  Claim ID
                </Text>
                <Text variant="headlineSmall" style={styles.claimId}>
                  {displayClaimId}
                </Text>

                <Text variant="labelLarge" style={[styles.label, styles.statusLabel]}>
                  Status
                </Text>
                <View style={styles.chipRow}>
                  {STATUS_ORDER.map((key) => (
                    <Chip
                      key={key}
                      mode="outlined"
                      compact
                      selected={key === lifecycle}
                      style={[styles.chip, chipStyle(key, lifecycle)]}
                      textStyle={chipTextStyle(key, lifecycle)}>
                      {CLAIM_LIFECYCLE_LABELS[key]}
                    </Chip>
                  ))}
                </View>
                {statusQuery.data?.message ? (
                  <Text variant="bodyMedium" style={styles.message}>
                    {statusQuery.data.message}
                  </Text>
                ) : null}
              </Card.Content>
            </Card>

            <Card style={[clinicScreen.card, styles.noteCard]} mode="outlined">
              <Card.Content>
                <Text variant="titleSmall" style={styles.noteTitle}>
                  Note
                </Text>
                <Text variant="bodyMedium" style={styles.noteBody}>
                  {lifecycle === 'approved'
                    ? `${CLAIM_APPROVED_DELIVERY_NOTE}\n\n${CLAIM_STATUS_TRACKING_NOTE}`
                    : CLAIM_STATUS_TRACKING_NOTE}
                </Text>
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>
      <LoadingOverlay
        visible={!!queryId && statusQuery.isFetching}
        message="Loading claim status…"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  intro: {
    ...typography.subtitle,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: 0,
  },
  cardTitle: {
    ...typography.title,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  loadBtn: {
    marginTop: spacing.xs / 2,
  },
  hint: {
    marginBottom: spacing.sm,
  },
  muted: {
    ...typography.subtitle,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  error: {
    ...typography.title,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.small,
    marginBottom: 6,
  },
  statusLabel: {
    marginTop: spacing.lg,
  },
  claimId: {
    ...typography.title,
    fontSize: 22,
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
  },
  message: {
    ...typography.body,
    marginTop: spacing.lg,
  },
  noteCard: {
    marginTop: spacing.xs / 2,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  noteTitle: {
    ...typography.title,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  noteBody: {
    ...typography.body,
  },
});
