import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Card, Chip, Divider, HelperText, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompactScreenHeader } from '@/components/ui/CompactScreenHeader';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { useClinicClaimDetailQuery } from '@/hooks/useClinicClaimDetailQuery';
import {
  CLAIM_LIFECYCLE_LABELS,
  normalizeClaimLifecycleStatus,
  type ClaimLifecycleStatus,
} from '@/services/claimService';

function parseId(raw: string | string[] | undefined): number | null {
  if (raw == null) return null;
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(String(v).trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function statusChipColors(lifecycle: ClaimLifecycleStatus): {
  bg: string;
  border: string;
  text: string;
} {
  switch (lifecycle) {
    case 'approved':
      return {
        bg: 'rgba(27, 122, 108, 0.15)',
        border: colors.success,
        text: colors.success,
      };
    case 'rejected':
      return {
        bg: 'rgba(179, 38, 30, 0.12)',
        border: colors.error,
        text: colors.error,
      };
    case 'verifying':
      return {
        bg: 'rgba(46, 189, 180, 0.18)',
        border: colors.primary,
        text: colors.secondary,
      };
    default:
      return {
        bg: colors.surfaceVariant,
        border: colors.border,
        text: colors.textMuted,
      };
  }
}

export default function ClaimDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const claimId = useMemo(() => parseId(params.id), [params.id]);

  const detailQuery = useClinicClaimDetailQuery(claimId, {
    enabled: claimId != null,
  });

  const lifecycle = useMemo(
    () => normalizeClaimLifecycleStatus(detailQuery.data?.status),
    [detailQuery.data?.status],
  );
  const chipColors = statusChipColors(lifecycle);

  const onRefresh = useCallback(() => {
    void detailQuery.refetch();
  }, [detailQuery]);

  async function openDoc(url: string) {
    const u = url.trim();
    if (!u) return;
    try {
      const can = await Linking.canOpenURL(u);
      if (can) await Linking.openURL(u);
    } catch {
      /* ignore */
    }
  }

  if (claimId == null) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <CompactScreenHeader title="Claim details" />
        <View style={[clinicScreen.screenPadding, styles.centerMsg]}>
          <HelperText type="error" visible>
            Missing claim id. Go back and open a claim from the list.
          </HelperText>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backLink, pressed && { opacity: 0.8 }]}>
            <Text style={styles.backLinkText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const d = detailQuery.data;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <CompactScreenHeader title="Claim details" />

      <ScrollView
        contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={detailQuery.isFetching && !detailQuery.isPending}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }>
        {detailQuery.isError ? (
          <Card style={clinicScreen.card} mode="outlined">
            <Card.Content>
              <Text variant="bodyLarge" style={styles.errorTitle}>
                Could not load claim
              </Text>
              <Text variant="bodyMedium" style={styles.muted}>
                {detailQuery.error instanceof Error
                  ? detailQuery.error.message
                  : 'Something went wrong.'}
              </Text>
              <HelperText type="info" visible style={styles.pullHint}>
                Pull down to retry.
              </HelperText>
            </Card.Content>
          </Card>
        ) : null}

        {d ? (
          <>
            <Card style={[clinicScreen.card, styles.card]} mode="elevated">
              <Card.Content>
                <Text variant="labelLarge" style={styles.label}>
                  CLM no.
                </Text>
                <Text variant="headlineSmall" style={styles.claimNo}>
                  {(d.claim_number ?? '').trim() || `CLM-${d.id}`}
                </Text>
                <Text variant="labelLarge" style={[styles.label, styles.gapTop]}>
                  Status
                </Text>
                <Chip
                  mode="outlined"
                  compact
                  style={[
                    styles.chip,
                    {
                      backgroundColor: chipColors.bg,
                      borderColor: chipColors.border,
                    },
                  ]}
                  textStyle={{ color: chipColors.text, fontWeight: '700' }}>
                  {CLAIM_LIFECYCLE_LABELS[lifecycle]}
                </Chip>
                <View style={styles.metaGrid}>
                  <MetaItem label="Raised on" value={d.raised_on} />
                  {d.reviewed_at ? (
                    <MetaItem label="Reviewed at" value={d.reviewed_at} />
                  ) : null}
                  {d.settled_at ? (
                    <MetaItem label="Settled at" value={d.settled_at} />
                  ) : null}
                </View>
                {d.rejection_reason ? (
                  <>
                    <Divider style={styles.divider} />
                    <Text variant="labelLarge" style={styles.label}>
                      Rejection reason
                    </Text>
                    <Text variant="bodyMedium" style={styles.rejectReason}>
                      {d.rejection_reason}
                    </Text>
                  </>
                ) : null}
              </Card.Content>
            </Card>

            <Card style={[clinicScreen.card, styles.card]} mode="elevated">
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Patient
                </Text>
                <Text variant="bodyLarge" style={styles.bold}>
                  {d.patient.name}
                </Text>
                <Text variant="bodyMedium" style={styles.muted}>
                  {[
                    d.patient.gender,
                    d.patient.age != null ? `Age ${d.patient.age}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </Card.Content>
            </Card>

            <Card style={[clinicScreen.card, styles.card]} mode="elevated">
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Visit
                </Text>
                <Row label="Visited at" value={d.visit.visited_at} />
                <Row label="Doctor" value={d.visit.doctor} />
                <Row label="Specialization" value={d.visit.specialization} />
                {d.visit.concession_applied != null ? (
                  <Row
                    label="Concession"
                    value={
                      d.visit.concession_applied
                        ? String(d.visit.concession_amount ?? 'Yes')
                        : 'No'
                    }
                  />
                ) : null}
              </Card.Content>
            </Card>

            <Card style={[clinicScreen.card, styles.card]} mode="elevated">
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Financials
                </Text>
                <Row
                  label="Total claimed"
                  value={String(d.financials.total_claimed)}
                />
                <Row
                  label="Approved amount"
                  value={String(d.financials.approved_amount)}
                />
                {d.financials.difference != null &&
                d.financials.difference !== '' ? (
                  <Row
                    label="Difference"
                    value={String(d.financials.difference)}
                  />
                ) : null}
              </Card.Content>
            </Card>

            {d.services.length > 0 ? (
              <Card style={[clinicScreen.card, styles.card]} mode="elevated">
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Services
                  </Text>
                  {d.services.map((s, i) => (
                    <View
                      key={`${s.service_name}-${i}`}
                      style={[
                        styles.serviceBlock,
                        i < d.services.length - 1 && styles.serviceBlockBorder,
                      ]}>
                      <Text variant="bodyLarge" style={styles.bold}>
                        {s.service_name}
                      </Text>
                      {s.doctor ? (
                        <Text variant="bodySmall" style={styles.muted}>
                          {s.doctor}
                        </Text>
                      ) : null}
                      <View style={styles.serviceAmounts}>
                        <Text variant="bodySmall">
                          Claimed: {s.claimed_amount ?? '—'}
                        </Text>
                        <Text variant="bodySmall">
                          Approved: {s.approved_amount ?? '—'}
                        </Text>
                      </View>
                      {s.reason ? (
                        <Text variant="bodySmall" style={styles.reason}>
                          {s.reason}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </Card.Content>
              </Card>
            ) : null}

            {d.documents.length > 0 ? (
              <Card style={[clinicScreen.card, styles.card]} mode="elevated">
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Documents
                  </Text>
                  {d.documents.map((doc) => (
                    <Pressable
                      key={doc.id}
                      onPress={() => void openDoc(doc.url)}
                      disabled={!doc.url}
                      style={({ pressed }) => [
                        styles.docRow,
                        pressed && styles.docRowPressed,
                      ]}>
                      <MaterialCommunityIcons
                        name="file-document-outline"
                        size={22}
                        color={colors.secondary}
                      />
                      <View style={styles.docBody}>
                        <Text variant="bodyMedium" numberOfLines={2}>
                          {doc.file_name || doc.type}
                        </Text>
                        <Text variant="bodySmall" style={styles.muted}>
                          {doc.type}
                        </Text>
                      </View>
                      <MaterialCommunityIcons
                        name="open-in-new"
                        size={20}
                        color={colors.primary}
                      />
                    </Pressable>
                  ))}
                </Card.Content>
              </Card>
            ) : null}
          </>
        ) : detailQuery.isPending ? null : null}
      </ScrollView>

      <LoadingOverlay
        visible={detailQuery.isPending && !detailQuery.data}
        message="Loading claim…"
      />
    </SafeAreaView>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text variant="labelSmall" style={styles.muted}>
        {label}
      </Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="bodySmall" style={[styles.muted, styles.rowLabel]}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  centerMsg: { paddingTop: spacing.lg },
  backLink: { marginTop: spacing.md, alignSelf: 'flex-start' },
  backLinkText: { color: colors.primary, fontWeight: '600' },
  card: { marginBottom: spacing.md },
  label: { ...typography.small, marginBottom: 4 },
  gapTop: { marginTop: spacing.md },
  claimNo: { ...typography.title, fontSize: 22 },
  chip: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    borderWidth: 1,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  metaItem: { minWidth: '40%' },
  divider: { marginVertical: spacing.md },
  rejectReason: { color: colors.error, marginTop: spacing.xs },
  sectionTitle: {
    ...typography.title,
    marginBottom: spacing.sm,
    color: colors.secondary,
  },
  bold: { fontWeight: '700', color: colors.secondary },
  muted: { color: colors.textMuted },
  errorTitle: { color: colors.error, marginBottom: spacing.sm },
  pullHint: { marginTop: spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  rowLabel: { flex: 0.35 },
  rowValue: { flex: 0.65, textAlign: 'right', fontWeight: '500' },
  serviceBlock: { paddingVertical: spacing.sm },
  serviceBlockBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  serviceAmounts: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  reason: { marginTop: spacing.xs, fontStyle: 'italic' },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  docRowPressed: { opacity: 0.85 },
  docBody: { flex: 1, minWidth: 0 },
});
