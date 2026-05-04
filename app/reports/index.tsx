import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompactScreenHeader } from '@/components/ui/CompactScreenHeader';
import { clinicScreen, radii, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { useVisitHistoryStore } from '@/store';

type PatientSummary = {
  patientId: number;
  patientName: string;
  patientCardNumber: string;
  visitCount: number;
  lastAt: string;
};

function formatVisited(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ReportsPatientListScreen() {
  const visits = useVisitHistoryStore((s) => s.visits);

  const patients = useMemo(() => {
    const map = new Map<string, PatientSummary>();
    for (const v of visits) {
      const key = `${v.patientId}|${v.patientCardNumber}`;
      const cur = map.get(key);
      if (!cur) {
        map.set(key, {
          patientId: v.patientId,
          patientName: v.patientName,
          patientCardNumber: v.patientCardNumber,
          visitCount: 1,
          lastAt: v.completedAt,
        });
      } else {
        cur.visitCount += 1;
        if (v.completedAt > cur.lastAt) cur.lastAt = v.completedAt;
      }
    }
    return [...map.values()].sort((a, b) =>
      b.lastAt.localeCompare(a.lastAt),
    );
  }, [visits]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <CompactScreenHeader title="Reports" />

      <ScrollView
        contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
        showsVerticalScrollIndicator={false}>

        {patients.length === 0 ? (
          <Card style={[clinicScreen.card, styles.emptyCard]} mode="outlined">
            <Card.Content>
              <Text variant="titleSmall" style={styles.emptyTitle}>
                No visit records yet
              </Text>
            </Card.Content>
          </Card>
        ) : (
          patients.map((p) => (
            <Pressable
              key={`${p.patientId}|${p.patientCardNumber}`}
              onPress={() =>
                router.push({
                  pathname: '/reports/detail',
                  params: {
                    patientId: String(p.patientId),
                    cardNumber: p.patientCardNumber,
                  },
                } as Href)
              }
              style={({ pressed }) => [
                styles.rowPress,
                pressed && styles.rowPressPressed,
              ]}>
              <Card style={[clinicScreen.card, styles.rowCard]} mode="elevated">
                <Card.Content style={styles.rowInner}>
                  <View style={styles.avatar}>
                    <MaterialCommunityIcons
                      name="account-injury"
                      size={26}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.rowBody}>
                    <Text variant="titleMedium" style={styles.name} numberOfLines={2}>
                      {p.patientName}
                    </Text>
                    <Text variant="bodySmall" style={styles.cardNo}>
                      Card {p.patientCardNumber}
                    </Text>
                    <Text variant="bodySmall" style={styles.meta}>
                      {p.visitCount} visit{p.visitCount === 1 ? '' : 's'} · Last{' '}
                      {formatVisited(p.lastAt)}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color={colors.textMuted}
                  />
                </Card.Content>
              </Card>
            </Pressable>
          ))
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
  },
  intro: {
    ...typography.subtitle,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  emptyCard: {
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  emptyBody: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  rowPress: {
    marginBottom: spacing.sm,
  },
  rowPressPressed: {
    opacity: 0.92,
  },
  rowCard: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.secondary,
    fontWeight: '700',
  },
  cardNo: {
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  meta: {
    color: colors.textMuted,
    marginTop: 6,
  },
});
