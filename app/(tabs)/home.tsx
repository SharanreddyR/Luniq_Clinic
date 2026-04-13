import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type ClinicDashboardIcon,
  DashboardCard,
} from '@/components/dashboard/DashboardCard';
import {
  APP_NAME,
  clinicIcons,
  clinicScreen,
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from '@/constants';
import { useAuthStore, usePatientStore } from '@/store';

const DASHBOARD_CARDS: {
  key: string;
  title: string;
  subtitle: string;
  icon: ClinicDashboardIcon;
  href: '/patient-lookup' | '/appointments' | '/claim' | '/claim-status' | '/doctor-availability' | '/upload' | '/clinic-settings';
}[] = [
  {
    key: 'patient',
    title: 'Enter patient card',
    subtitle: 'Look up a patient by card number',
    icon: { pack: 'material', name: 'account-injury' },
    href: '/patient-lookup',
  },
  {
    key: 'appointments',
    title: 'Appointments',
    subtitle: 'Today, upcoming, and visit status',
    icon: { pack: 'material', name: 'calendar' },
    href: '/appointments',
  },
  {
    key: 'claims',
    title: 'Claims',
    subtitle: 'Submit and track insurance claims',
    icon: { pack: 'material', name: 'file-document' },
    href: '/claim',
  },
  {
    key: 'claim-status',
    title: 'Claim status',
    subtitle: 'Submitted, verifying, approved, or rejected',
    icon: { pack: 'material', name: 'file-document-outline' },
    href: '/claim-status',
  },
  {
    key: 'doctors',
    title: 'Doctors availability',
    subtitle: 'Roster, timings, and on-duty status',
    icon: { pack: 'material', name: 'doctor' },
    href: '/doctor-availability',
  },
  {
    key: 'upload',
    title: 'Upload center',
    subtitle: 'Prescriptions, reports, and bills',
    icon: { pack: 'material', name: 'cloud-upload' },
    href: '/upload',
  },
  {
    key: 'clinic-settings',
    title: 'Clinic settings',
    subtitle: 'Hours, open/closed, saved on device',
    icon: { pack: 'ionicons', name: 'storefront-outline' },
    href: '/clinic-settings',
  },
];

export default function ClinicDashboardScreen() {
  const clinic = useAuthStore((s) => s.clinic);
  const user = useAuthStore((s) => s.user);
  const activePatient = usePatientStore((s) => s.activePatient);
  const clearActivePatient = usePatientStore((s) => s.clearActivePatient);

  const displayName =
    clinic?.contactName ?? user?.name ?? clinic?.name ?? 'Clinic';
  const displaySub = clinic
    ? [clinic.name, clinic.address ? `Clinic ID: ${clinic.id}\n${clinic.address}` : `Clinic ID: ${clinic.id}`]
        .filter(Boolean)
        .join('\n')
    : (user?.email ?? '');
  const initial = displayName.charAt(0).toUpperCase();

  function goProfile() {
    router.push('/profile');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable
            onPress={goProfile}
            style={styles.profileBlock}
            accessibilityRole="button"
            accessibilityLabel="Open profile">
            <MaterialCommunityIcons
              name="account-circle"
              size={clinicIcons.size.lg}
              color={clinicIcons.color.secondary}
              style={styles.profileIcon}
            />
            <View style={styles.topBarText}>
              <Text variant="labelLarge" style={styles.greetingLabel}>
                Clinic dashboard
              </Text>
              <Text variant="headlineSmall" style={styles.name}>
                {displayName}
              </Text>
              <Text variant="bodySmall" style={styles.email}>
                {displaySub}
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={goProfile}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            hitSlop={10}
            style={({ pressed }) => [
              styles.avatarPress,
              pressed && styles.avatarPressPressed,
            ]}>
            <Avatar.Text size={48} label={initial} style={styles.avatar} />
          </Pressable>
        </View>

        {activePatient ? (
          <Card style={styles.patientStrip} mode="elevated">
            <Card.Content style={styles.patientStripContent}>
              <MaterialCommunityIcons
                name="account-injury"
                size={clinicIcons.size.md}
                color={clinicIcons.color.primary}
                style={styles.patientStripIcon}
              />
              <View style={styles.patientStripText}>
                <Text variant="labelSmall" style={styles.patientStripLabel}>
                  Active patient
                </Text>
                <Text variant="titleSmall" style={styles.patientStripName}>
                  {activePatient.name}
                </Text>
                <Text variant="bodySmall" style={styles.patientStripCard}>
                  Card {activePatient.cardNumber}
                  {activePatient.cardType
                    ? ` · ${activePatient.cardType}`
                    : ''}
                </Text>
              </View>
              <Button mode="text" compact onPress={clearActivePatient}>
                Clear
              </Button>
            </Card.Content>
          </Card>
        ) : null}

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Quick actions
        </Text>

        <View style={styles.grid}>
          {DASHBOARD_CARDS.map((item) => (
            <DashboardCard
              key={item.key}
              title={item.title}
              subtitle={item.subtitle}
              icon={item.icon}
              onPress={() => router.push(item.href as Href)}
            />
          ))}
        </View>

        <Text variant="bodySmall" style={styles.footerNote}>
          {APP_NAME} · Secure healthcare access
        </Text>
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
    paddingBottom: spacing.sm,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  profileBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: spacing.sm,
  },
  profileIcon: {
    marginRight: clinicIcons.textGap,
    marginTop: 2,
  },
  topBarText: {
    flex: 1,
    minWidth: 0,
  },
  avatarPress: {
    borderRadius: 28,
    padding: 2,
  },
  avatarPressPressed: {
    opacity: 0.75,
  },
  greetingLabel: {
    ...typography.small,
    marginBottom: spacing.xs,
  },
  name: {
    ...typography.title,
    fontSize: 20,
    lineHeight: 28,
  },
  email: {
    ...typography.subtitle,
    marginTop: spacing.xs,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  patientStrip: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    ...shadows.card,
  },
  patientStripContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  patientStripIcon: {
    marginRight: clinicIcons.textGap,
  },
  patientStripText: {
    flex: 1,
    marginRight: spacing.sm,
    minWidth: 0,
  },
  patientStripLabel: {
    ...typography.small,
    marginBottom: 2,
  },
  patientStripName: {
    ...typography.title,
    fontSize: 17,
  },
  patientStripCard: {
    ...typography.small,
    marginTop: spacing.xs / 2,
  },
  sectionTitle: {
    ...typography.title,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  footerNote: {
    ...typography.small,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
