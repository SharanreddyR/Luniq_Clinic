import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type ClinicDashboardIcon,
  DashboardCard,
} from '@/components/dashboard/DashboardCard';
import { BrandLogoMark } from '@/components/ClinicLogo';
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
  href:
    | '/patient-intake'
    | '/appointments'
    | '/claim-status'
    | '/doctor-availability'
    | '/upload'
    | '/clinic-settings';
}[] = [
  {
    key: 'patient',
    title: 'Patient visit',
    subtitle: 'One page: card, doctor, services, uploads & save',
    icon: { pack: 'material', name: 'account-injury' },
    href: '/patient-intake',
  },
  {
    key: 'appointments',
    title: 'Appointments',
    subtitle: 'Today, upcoming, and visit status',
    icon: { pack: 'material', name: 'calendar' },
    href: '/appointments',
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

const HERO_TOP = 'rgba(46, 189, 180, 0.14)';
const HERO_MID = 'rgba(244, 249, 249, 0.98)';

export default function ClinicDashboardScreen() {
  const clinic = useAuthStore((s) => s.clinic);
  const user = useAuthStore((s) => s.user);
  const activePatient = usePatientStore((s) => s.activePatient);
  const clearActivePatient = usePatientStore((s) => s.clearActivePatient);

  const displayName =
    clinic?.contactName ?? user?.name ?? clinic?.name ?? 'Clinic';
  const displaySub = clinic
    ? [
        clinic.name,
        clinic.address
          ? `Clinic ID: ${clinic.id}\n${clinic.address}`
          : `Clinic ID: ${clinic.id}`,
      ]
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
        contentContainerStyle={styles.scrollOuter}
        showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[HERO_TOP, HERO_MID, colors.background]}
          locations={[0, 0.55, 1]}
          style={styles.hero}>
          <View style={[clinicScreen.screenPadding, styles.heroInner]}>
            <View style={styles.topBar}>
              <Pressable
                onPress={goProfile}
                style={styles.profileBlock}
                accessibilityRole="button"
                accessibilityLabel="Open profile">
                <View style={styles.iconBubble}>
                  <BrandLogoMark size={28} padded />
                </View>
                <View style={styles.topBarText}>
                  <Text variant="labelLarge" style={styles.greetingLabel}>
                    Welcome back
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
                <Avatar.Text size={52} label={initial} style={styles.avatar} />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        <View style={[clinicScreen.screenPadding, styles.body]}>
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

          <View style={styles.sectionHead}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Quick actions
            </Text>
            <View style={styles.sectionRule} />
          </View>

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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollOuter: {
    paddingBottom: spacing.sm,
  },
  hero: {
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    marginBottom: spacing.md,
    ...shadows.card,
    shadowOpacity: 0.05,
    elevation: 2,
  },
  heroInner: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  body: {
    paddingTop: 0,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: spacing.sm,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  name: {
    ...typography.title,
    fontSize: 22,
    lineHeight: 30,
    color: colors.secondary,
  },
  email: {
    ...typography.subtitle,
    marginTop: spacing.xs,
  },
  avatar: {
    backgroundColor: colors.secondary,
  },
  patientStrip: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
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
  sectionHead: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 18,
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  sectionRule: {
    height: 3,
    width: 40,
    borderRadius: 2,
    backgroundColor: colors.primary,
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
    marginTop: spacing.lg,
    opacity: 0.85,
  },
});
