import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Divider, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompactScreenHeader } from '@/components/ui/CompactScreenHeader';
import { INTAKE_UPLOAD_ROWS } from '@/constants/intakeUploads';
import { clinicScreen, radii, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import type { UploadCategory } from '@/services/uploadService';
import type { ClinicVisitRecord } from '@/types/visitHistory';
import { useVisitHistoryStore } from '@/store';

function categoryLabel(category: UploadCategory): string {
  return (
    INTAKE_UPLOAD_ROWS.find((r) => r.category === category)?.label ?? category
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function VisitBlock({ visit }: { visit: ClinicVisitRecord }) {
  return (
    <Card style={[clinicScreen.card, styles.visitCard]} mode="elevated">
      <Card.Content>
        <View style={styles.visitHead}>
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={22}
            color={colors.primary}
          />
          <View style={styles.visitHeadText}>
            <Text variant="titleSmall" style={styles.visitTitle}>
              Visit {visit.slipId}
            </Text>
            <Text variant="bodySmall" style={styles.visitWhen}>
              {formatWhen(visit.completedAt)}
            </Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <Text variant="labelSmall" style={styles.k}>
          Doctor & department
        </Text>
        <Text variant="bodyMedium" style={styles.v}>
          {visit.doctorName} · {visit.department}
        </Text>

        <Text variant="labelSmall" style={[styles.k, styles.kSpacing]}>
          Services & billing
        </Text>
        {visit.services.map((svc) => (
          <View key={svc} style={styles.serviceRow}>
            <Text variant="bodyMedium" style={styles.serviceName}>
              {svc}
            </Text>
            <Text variant="bodyMedium" style={styles.serviceAmt}>
              ₹{visit.serviceAmounts[svc] ?? '0'}
            </Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text variant="titleSmall" style={styles.totalLabel}>
            Total
          </Text>
          <Text variant="titleSmall" style={styles.totalValue}>
            ₹{visit.totalAmount}
          </Text>
        </View>

        <Text variant="labelSmall" style={[styles.k, styles.kSpacing]}>
          Visit notes
        </Text>
        <Text variant="bodyMedium" style={styles.v}>
          {visit.symptoms.trim() ? visit.symptoms : '—'}
        </Text>

        <Text variant="labelSmall" style={[styles.k, styles.kSpacing]}>
          Reports & files uploaded
        </Text>
        {visit.attachments.every((a) => a.files.length === 0) ? (
          <Text variant="bodyMedium" style={styles.none}>
            No files attached for this visit.
          </Text>
        ) : (
          visit.attachments.map((group) => (
            <View key={group.category} style={styles.attachGroup}>
              <Text variant="bodySmall" style={styles.attachCat}>
                {categoryLabel(group.category)}
              </Text>
              {group.files.length === 0 ? (
                <Text variant="bodySmall" style={styles.noneIndent}>
                  None
                </Text>
              ) : (
                group.files.map((f, i) => (
                  <View key={`${f.name}-${i}`} style={styles.fileRow}>
                    <MaterialCommunityIcons
                      name="file-document-outline"
                      size={18}
                      color={colors.textMuted}
                    />
                    <Text variant="bodyMedium" style={styles.fileName} numberOfLines={2}>
                      {f.name}
                      {f.mimeType ? ` · ${f.mimeType}` : ''}
                    </Text>
                  </View>
                ))
              )}
            </View>
          ))
        )}
      </Card.Content>
    </Card>
  );
}

export default function ReportsPatientDetailScreen() {
  const { patientId: pidRaw, cardNumber } = useLocalSearchParams<{
    patientId?: string;
    cardNumber?: string;
  }>();

  const patientId = Number(pidRaw);
  const card =
    typeof cardNumber === 'string' ? cardNumber : Array.isArray(cardNumber) ? cardNumber[0] ?? '' : '';

  const allVisits = useVisitHistoryStore((s) => s.visits);

  const visits = useMemo(() => {
    if (!Number.isFinite(patientId) || !card) return [];
    return allVisits
      .filter(
        (v) => v.patientId === patientId && v.patientCardNumber === card,
      )
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }, [allVisits, patientId, card]);

  const patientName = visits[0]?.patientName ?? 'Patient';

  const invalid = !Number.isFinite(patientId) || !card;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <CompactScreenHeader
        title="Visit history"
        onBackPress={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
        showsVerticalScrollIndicator={false}>
        {invalid ? (
          <Card style={[clinicScreen.card, styles.warnCard]} mode="outlined">
            <Card.Content>
              <Text variant="bodyMedium" style={styles.warnText}>
                Missing patient information. Go back and choose someone from the
                list.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <>
            <Card style={[clinicScreen.card, styles.patientBanner]} mode="elevated">
              <Card.Content style={styles.heroInner}>
                <View style={styles.heroIcon}>
                  <MaterialCommunityIcons
                    name="account-heart"
                    size={28}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.heroText}>
                  <Text variant="headlineSmall" style={styles.heroName}>
                    {patientName}
                  </Text>
                  <Text variant="bodyMedium" style={styles.patientCardNumber}>
                    Card {card}
                  </Text>
                  <Text variant="bodySmall" style={styles.heroMeta}>
                    {visits.length} visit record{visits.length === 1 ? '' : 's'}{' '}
                    on this device
                  </Text>
                </View>
              </Card.Content>
            </Card>

            {visits.length === 0 ? (
              <Card style={[clinicScreen.card, styles.warnCard]} mode="outlined">
                <Card.Content>
                  <Text variant="bodyMedium" style={styles.warnText}>
                    No saved visits for this patient. Records are stored locally
                    when you complete a visit.
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              visits.map((v) => <VisitBlock key={v.id} visit={v} />)
            )}
          </>
        )}
      </ScrollView>
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
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  patientBanner: {
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  heroInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  heroName: {
    color: colors.secondary,
    fontWeight: '700',
  },
  patientCardNumber: {
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  heroMeta: {
    color: colors.textMuted,
    marginTop: 6,
  },
  visitCard: {
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  visitHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  visitHeadText: {
    flex: 1,
    minWidth: 0,
  },
  visitTitle: {
    color: colors.secondary,
    fontWeight: '700',
  },
  visitWhen: {
    color: colors.textMuted,
    marginTop: 4,
  },
  divider: {
    marginVertical: spacing.md,
    backgroundColor: colors.border,
  },
  k: {
    ...typography.small,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  kSpacing: {
    marginTop: spacing.md,
  },
  v: {
    color: colors.secondary,
    marginTop: 6,
    lineHeight: 22,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: 8,
  },
  serviceName: {
    flex: 1,
    color: colors.text,
  },
  serviceAmt: {
    color: colors.secondary,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    color: colors.secondary,
    fontWeight: '700',
  },
  totalValue: {
    color: colors.primary,
    fontWeight: '800',
  },
  none: {
    color: colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  noneIndent: {
    color: colors.textMuted,
    marginLeft: spacing.sm,
    marginTop: 4,
  },
  attachGroup: {
    marginTop: spacing.sm,
  },
  attachCat: {
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: 4,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: 6,
  },
  fileName: {
    flex: 1,
    color: colors.text,
    lineHeight: 20,
  },
  warnCard: {
    borderColor: colors.border,
  },
  warnText: {
    color: colors.textMuted,
    lineHeight: 22,
  },
});
