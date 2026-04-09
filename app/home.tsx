import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import {
  Avatar,
  Button,
  Card,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { APP_NAME } from '@/constants/config';
import { useAuthStore } from '@/store/authStore';

export default function HomeDashboard() {
  const clinic = useAuthStore((s) => s.clinic);
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  function signOut() {
    clearSession();
    router.replace('/login');
  }

  const displayName = clinic?.name ?? user?.name ?? 'Patient';
  const displaySub = clinic
    ? `Clinic ID: ${clinic.id}`
    : (user?.email ?? '');
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <View>
          <Text variant="labelLarge" style={styles.greetingLabel}>
            {clinic ? 'Clinic' : 'Signed in as'}
          </Text>
          <Text variant="titleLarge" style={styles.name}>
            {displayName}
          </Text>
          <Text variant="bodySmall" style={styles.email}>
            {displaySub}
          </Text>
        </View>
        <Avatar.Text size={52} label={initial} style={styles.avatar} />
      </View>

      <Text variant="headlineSmall" style={styles.sectionTitle}>
        Today
      </Text>

      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Patient lookup
          </Text>
          <Text variant="bodyMedium" style={styles.cardBody}>
            Find a patient by card number — view name and photo.
          </Text>
          <Button
            mode="contained-tonal"
            onPress={() => router.push('/patient-lookup')}
            style={styles.actionBtn}
            textColor={colors.secondary}>
            Open patient lookup
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            OPD
          </Text>
          <Text variant="bodyMedium" style={styles.cardBody}>
            Generate slip, assign a doctor, and save the visit.
          </Text>
          <Button
            mode="contained-tonal"
            onPress={() => router.push('/opd')}
            style={styles.actionBtn}
            textColor={colors.secondary}>
            Open OPD
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Uploads
          </Text>
          <Text variant="bodyMedium" style={styles.cardBody}>
            Prescriptions, reports, and bills.
          </Text>
          <Button
            mode="contained-tonal"
            onPress={() => router.push('/upload')}
            style={styles.actionBtn}
            textColor={colors.secondary}>
            Open uploads
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Claims
          </Text>
          <Text variant="bodyMedium" style={styles.cardBody}>
            Submit a claim and check verification status.
          </Text>
          <Button
            mode="contained-tonal"
            onPress={() => router.push('/claim')}
            style={styles.actionBtn}
            textColor={colors.secondary}>
            Open claims
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Doctor management
          </Text>
          <Text variant="bodyMedium" style={styles.cardBody}>
            Roster, timings, and on-duty availability.
          </Text>
          <Button
            mode="contained-tonal"
            onPress={() => router.push('/doctor-management')}
            style={styles.actionBtn}
            textColor={colors.secondary}>
            Manage doctors
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Next appointment
          </Text>
          <Text variant="bodyMedium" style={styles.cardBody}>
            No upcoming visits. Tap below when scheduling is connected to your
            clinic.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.rowCard}>
          <View style={styles.stat}>
            <Text variant="headlineMedium" style={styles.statValue}>
              —
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Messages
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text variant="headlineMedium" style={styles.statValue}>
              —
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Prescriptions
            </Text>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.spacer} />

      <View style={styles.footer}>
        <Text variant="bodySmall" style={styles.footerNote}>
          {APP_NAME} · Secure healthcare access
        </Text>
        <Button mode="outlined" onPress={signOut} style={styles.signOut}>
          Sign out
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    paddingTop: 8,
  },
  greetingLabel: {
    color: colors.textMuted,
  },
  name: {
    color: colors.secondary,
    fontWeight: '700',
    marginTop: 2,
  },
  email: {
    color: colors.textMuted,
    marginTop: 2,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  sectionTitle: {
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
    marginBottom: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  cardTitle: {
    color: colors.secondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardBody: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  actionBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: colors.primary,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textMuted,
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  footer: {
    paddingBottom: 16,
    paddingTop: 8,
  },
  footerNote: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  signOut: {
    borderColor: colors.border,
  },
});
