import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompactScreenHeader } from '@/components/ui/CompactScreenHeader';
import { clinicScreen, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { useClinicTimingsApiQuery } from '@/hooks/useClinicTimingsApiQuery';
import { apiTimeToHi } from '@/services/clinicTimingService';
import { useAuthStore } from '@/store';

function formatDayLabel(day: string): string {
  const d = day.trim().toLowerCase();
  if (!d) return day;
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export default function ClinicSettingsScreen() {
  const token = useAuthStore((s) => s.token);

  const timingsApiQuery = useClinicTimingsApiQuery({
    enabled: Boolean(token),
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <CompactScreenHeader title="Clinic settings" />

      <ScrollView
        contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <Card style={[clinicScreen.card, styles.card, styles.weekCard]} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Weekly hours
            </Text>
            {!token ? (
              <Text variant="bodySmall" style={styles.weekEmpty}>
                Sign in as a clinic user to load this schedule.
              </Text>
            ) : timingsApiQuery.isPending ? (
              <View style={styles.weekLoading}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : timingsApiQuery.isError ? (
              <Text variant="bodySmall" style={styles.weekEmpty}>
                {timingsApiQuery.error instanceof Error
                  ? timingsApiQuery.error.message
                  : 'Could not load timings.'}
              </Text>
            ) : timingsApiQuery.data && timingsApiQuery.data.length > 0 ? (
              timingsApiQuery.data.map((slot) => (
                <View key={slot.day} style={styles.weekRow}>
                  <View style={styles.weekDayCol}>
                    <Text variant="labelLarge" style={styles.weekDay}>
                      {formatDayLabel(slot.day)}
                    </Text>
                    {slot.is_open_now ? (
                      <Text style={styles.openNowTiny}>Open now</Text>
                    ) : null}
                  </View>
                  <Text
                    variant="bodyMedium"
                    style={
                      slot.is_closed ? styles.weekHoursClosed : styles.weekHours
                    }>
                    {slot.is_closed
                      ? 'Closed / leave'
                      : `${apiTimeToHi(slot.opens_at) || '—'} – ${apiTimeToHi(slot.closes_at) || '—'}`}
                  </Text>
                </View>
              ))
            ) : (
              <Text variant="bodySmall" style={styles.weekEmpty}>
                No timings returned yet. Add them under Manage weekly timings.
              </Text>
            )}
            <Button
              mode="contained"
              onPress={() => router.push('/clinic-timings')}
              disabled={!token}
              style={[clinicScreen.button, styles.manageTimingsBtn]}
              contentStyle={clinicScreen.buttonContent}>
              Manage weekly timings
            </Button>
          </Card.Content>
        </Card>
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
    paddingBottom: spacing.xl,
  },
  intro: {
    ...typography.subtitle,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  card: {
    marginBottom: spacing.md,
  },
  weekCard: {
    marginBottom: spacing.md,
  },
  weekLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  weekDayCol: {
    width: '40%',
  },
  weekDay: {
    color: colors.secondary,
    fontWeight: '700',
  },
  openNowTiny: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  manageTimingsBtn: {
    marginTop: spacing.md,
  },
  weekHours: {
    flex: 1,
    textAlign: 'right',
    color: colors.text,
    fontWeight: '600',
  },
  weekHoursClosed: {
    flex: 1,
    textAlign: 'right',
    color: colors.textMuted,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  weekEmpty: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  cardTitle: {
    ...typography.title,
    marginBottom: spacing.md,
  },
  muted: {
    ...typography.subtitle,
    marginBottom: spacing.md,
  },
});
