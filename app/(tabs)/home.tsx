import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Text } from 'react-native-paper';

import { NotificationsSheet } from '@/components/notifications/NotificationsSheet';
import { useNotificationsInfinite } from '@/hooks/useNotifications';
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
import { useAuthStore, usePatientStore, useVisitHistoryStore } from '@/store';

const DASHBOARD_CARDS: {
  key: string;
  title: string;
  subtitle: string;
  icon: ClinicDashboardIcon;
  href:
    | '/patient-intake'
    | '/view-patients'
    | '/appointments'
    | '/reports'
    | '/claim-status'
    | '/doctor-availability'
    | '/clinic-services'
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
    key: 'view-patients',
    title: 'View patients',
    subtitle: 'Look up by card, see everyone on the plan, then start a visit',
    icon: { pack: 'material', name: 'account-group-outline' },
    href: '/view-patients',
  },
  {
    key: 'appointments',
    title: 'View Appointments',
    subtitle: 'Today, upcoming, and visit status',
    icon: { pack: 'material', name: 'calendar' },
    href: '/appointments',
  },
  {
    key: 'reports',
    title: 'Reports',
    subtitle: 'Patients visited, files & visit history',
    icon: { pack: 'material', name: 'file-chart-outline' },
    href: '/reports',
  },
  {
    key: 'claim-status',
    title: 'Claim status',
    subtitle: 'Submitted, verifying, approved, or rejected',
    icon: { pack: 'material', name: 'file-document-outline' },
    href: '/claim-status',
  },
  {
    key: 'clinic-settings',
    title: 'Clinic settings',
    subtitle: 'Hours, open/closed, saved on device',
    icon: { pack: 'ionicons', name: 'storefront-outline' },
    href: '/clinic-settings',
  },
  {
    key: 'doctors',
    title: 'Doctors availability',
    subtitle: 'Roster, timings, and on-duty status',
    icon: { pack: 'material', name: 'doctor' },
    href: '/doctor-availability',
  },
  {
    key: 'services',
    title: 'Services',
    subtitle: 'Choose which offerings apply to your clinic',
    icon: { pack: 'material', name: 'medical-bag' },
    href: '/clinic-services',
  },
];

/** Brighter hero wash → crisp white → soft clinic tint */
const HERO_GRADIENT = ['#C8F5EE', '#FFFFFF', '#EEF9F7'] as const;

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

function daypartMeta(now = new Date()): {
  label: string;
  icon: MciName;
  tint: string;
} {
  const h = now.getHours();
  if (h >= 5 && h < 12) {
    return {
      label: 'Good Morning',
      icon: 'weather-sunset-up',
      tint: '#E59610',
    };
  }
  if (h >= 12 && h < 17) {
    return {
      label: 'Good Afternoon',
      icon: 'brightness-7',
      tint: '#F4C430',
    };
  }
  return {
    label: 'Good Evening',
    icon: 'weather-night',
    tint: '#5B7FD1',
  };
}

export default function ClinicDashboardScreen() {
  const clinic = useAuthStore((s) => s.clinic);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const activePatient = usePatientStore((s) => s.activePatient);
  const clearActivePatient = usePatientStore((s) => s.clearActivePatient);
  const visitRecords = useVisitHistoryStore((s) => s.visits);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsQuery = useNotificationsInfinite(20);
  const refetchNotifications = notificationsQuery.refetch;

  const unreadNotifications =
    notificationsQuery.data?.pages[0]?.unread_count ?? 0;

  useEffect(() => {
    if (!notificationsOpen || !token) return;
    void refetchNotifications();
  }, [notificationsOpen, token, refetchNotifications]);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      void refetchNotifications();
    }, [token, refetchNotifications]),
  );

  const distinctVisitPatients = useMemo(() => {
    const keys = new Set<string>();
    for (const v of visitRecords) {
      keys.add(`${v.patientId}|${v.patientCardNumber}`);
    }
    return keys.size;
  }, [visitRecords]);

  const daypart = daypartMeta();

  const displayName =
    clinic?.contactName ?? user?.name ?? clinic?.name ?? 'Clinic';
  const clinicNameLine = clinic?.name?.trim() ?? '';
  const clinicAddressLine = clinic?.address?.trim() ?? '';
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
          colors={[...HERO_GRADIENT]}
          locations={[0, 0.42, 1]}
          style={styles.hero}>
          <View style={[clinicScreen.screenPadding, styles.heroInner]}>
            <View style={styles.topHeader}>
              <View style={styles.greetingWrap}>
                <Text variant="titleSmall" style={styles.greetingTop}>
                  Hello, {displayName.split(' ')[0]} 👋
                </Text>
                {clinic ? (
                  <>
                    {clinicNameLine ? (
                      <Text
                        variant="bodySmall"
                        style={styles.greetingSub}
                        numberOfLines={2}>
                        {clinicNameLine}
                      </Text>
                    ) : null}
                    {clinicAddressLine ? (
                      <View style={styles.addressRow}>
                        <MaterialCommunityIcons
                          name="map-marker-outline"
                          size={17}
                          color={colors.textMuted}
                          style={styles.addressIcon}
                        />
                        <Text
                          variant="bodySmall"
                          style={styles.greetingAddress}
                          numberOfLines={3}>
                          {clinicAddressLine}
                        </Text>
                      </View>
                    ) : null}
                    {!clinicNameLine && !clinicAddressLine ? (
                      <Text variant="bodySmall" style={styles.greetingSub}>
                        Welcome to your clinic dashboard
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text
                    variant="bodySmall"
                    style={styles.greetingSub}
                    numberOfLines={2}>
                    {user?.email ?? 'Welcome to your clinic dashboard'}
                  </Text>
                )}
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  style={styles.notifyWrap}
                  accessibilityRole="button"
                  accessibilityLabel={
                    unreadNotifications > 0
                      ? `Notifications, ${unreadNotifications} unread`
                      : 'Notifications'
                  }
                  hitSlop={8}
                  disabled={!token}
                  onPress={() => setNotificationsOpen(true)}>
                  <View style={styles.notifyBtn}>
                    <MaterialCommunityIcons
                      name="bell-outline"
                      size={20}
                      color={token ? colors.secondary : colors.textMuted}
                    />
                    {token && unreadNotifications > 0 ? (
                      <View style={styles.notifyBadge}>
                        <Text variant="labelSmall" style={styles.notifyBadgeText}>
                          {unreadNotifications > 99
                            ? '99+'
                            : String(unreadNotifications)}
                        </Text>
                      </View>
                    ) : null}
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
                  <Avatar.Text size={46} label={initial} style={styles.avatar} />
                </Pressable>
              </View>
            </View>
          </View>
        </LinearGradient>

        <NotificationsSheet
          visible={notificationsOpen}
          onDismiss={() => setNotificationsOpen(false)}
        />

        <View style={[clinicScreen.screenPadding, styles.body]}>
          <View style={styles.sectionHeadInline}>
            <Text variant="labelSmall" style={styles.sectionKicker}>
              Shortcuts
            </Text>
            <View style={styles.quickHeadingRow}>
              <Text
                variant="titleMedium"
                style={[styles.sectionTitleTight, styles.quickActionsTitle]}
                numberOfLines={1}>
                Quick actions
              </Text>
              <View style={styles.daypartCluster}>
                <MaterialCommunityIcons
                  name={daypart.icon}
                  size={15}
                  color={daypart.tint}
                  style={styles.daypartIcon}
                />
                <Text variant="labelSmall" style={styles.daypartGreeting}>
                  {daypart.label}
                </Text>
              </View>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRow}>
            {DASHBOARD_CARDS.slice(0, 4).map((item) => (
              <Pressable
                key={item.key}
                onPress={() => router.push(item.href as Href)}
                android_ripple={{ color: 'rgba(34, 184, 174, 0.18)' }}
                style={({ pressed }) => [
                  styles.quickCard,
                  Platform.OS === 'ios' && pressed && styles.quickCardPressed,
                ]}>
                <LinearGradient
                  colors={['#D2FAF4', '#E8FFFB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickIconWrap}>
                  <MaterialCommunityIcons
                    name={
                      item.icon.pack === 'material' ? item.icon.name : 'stethoscope'
                    }
                    size={23}
                    color={colors.secondaryElevated}
                  />
                </LinearGradient>
                <Text variant="labelLarge" style={styles.quickTitle}>
                  {item.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.summaryRow}>
            <Card style={[styles.summaryCard, styles.summaryCardLeft]} mode="elevated">
              <Card.Content>
                <Text variant="labelSmall" style={styles.summaryLabel}>
                  Visit records
                </Text>
                <Text variant="headlineSmall" style={styles.summaryValue}>
                  {visitRecords.length}
                </Text>
                <Text variant="bodySmall" style={styles.summaryHint}>
                  Saved on this device
                </Text>
              </Card.Content>
            </Card>
            <Card style={[styles.summaryCard, styles.summaryCardRight]} mode="elevated">
              <Card.Content>
                <Text variant="labelSmall" style={styles.summaryLabel}>
                  Patients in reports
                </Text>
                <Text variant="headlineSmall" style={styles.summaryValue}>
                  {distinctVisitPatients}
                </Text>
                <Text variant="bodySmall" style={styles.summaryHint}>
                  Open Reports for history
                </Text>
              </Card.Content>
            </Card>
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

          <View style={styles.sectionHead}>
            <Text variant="labelSmall" style={styles.sectionKicker}>
              Full menu
            </Text>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Doctors & services
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
    backgroundColor: '#F0FAF8',
  },
  scrollOuter: {
    paddingBottom: spacing.sm,
  },
  hero: {
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    marginBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(10, 82, 87, 0.08)',
    ...shadows.card,
    shadowColor: '#0A5257',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroInner: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  greetingWrap: {
    flex: 1,
  },
  greetingTop: {
    ...typography.title,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: colors.secondary,
    marginBottom: spacing.xs / 2,
    letterSpacing: -0.3,
  },
  greetingSub: {
    ...typography.small,
    color: colors.secondaryElevated,
    lineHeight: 20,
    fontWeight: '500',
    opacity: 0.92,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
    maxWidth: '100%',
  },
  addressIcon: {
    marginTop: 1,
  },
  greetingAddress: {
    ...typography.small,
    flex: 1,
    color: colors.textMuted,
    lineHeight: 20,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notifyWrap: {
    position: 'relative',
    zIndex: 1,
  },
  notifyBtn: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 184, 174, 0.35)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    ...shadows.card,
    shadowOpacity: 0.06,
    elevation: 2,
  },
  notifyBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    zIndex: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 8,
  },
  notifyBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10,
    lineHeight: 12,
    marginVertical: 0,
    marginHorizontal: 0,
  },
  body: {
    paddingTop: 0,
    paddingBottom: spacing.xxl + spacing.lg,
  },
  sectionHeadInline: {
    marginBottom: spacing.sm,
  },
  quickHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  daypartCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  daypartIcon: {
    marginTop: -1,
  },
  daypartGreeting: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: colors.secondary,
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  sectionKicker: {
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
    opacity: 0.95,
  },
  sectionTitleTight: {
    ...typography.title,
    fontSize: 19,
    color: colors.secondary,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  quickActionsTitle: {
    flex: 1,
    minWidth: 0,
  },
  quickRow: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
    paddingRight: spacing.sm,
  },
  quickCard: {
    width: 132,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(10, 82, 87, 0.12)',
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...shadows.card,
    shadowColor: '#0A5257',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  quickCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  quickIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34, 184, 174, 0.25)',
  },
  quickTitle: {
    color: colors.secondary,
    fontWeight: '800',
    lineHeight: 20,
    fontSize: 11,
    letterSpacing: -0.2,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(10, 82, 87, 0.1)',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    ...shadows.card,
    shadowColor: '#0A5257',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  summaryCardLeft: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  summaryCardRight: {
    borderLeftWidth: 4,
    borderLeftColor: colors.secondaryElevated,
  },
  summaryLabel: {
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  summaryValue: {
    color: colors.secondary,
    fontWeight: '800',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  summaryHint: {
    color: colors.textMuted,
    marginTop: spacing.xs / 2,
    lineHeight: 18,
    fontWeight: '500',
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
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  patientStrip: {
    marginBottom: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 184, 174, 0.35)',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadows.card,
    shadowOpacity: 0.08,
    elevation: 3,
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
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 19,
    fontWeight: '800',
    color: colors.secondary,
    marginBottom: spacing.sm,
    letterSpacing: -0.2,
  },
  sectionRule: {
    height: 4,
    width: 48,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  footerNote: {
    ...typography.small,
    textAlign: 'center',
    marginTop: spacing.xl,
    opacity: 0.75,
    color: colors.textMuted,
    fontWeight: '500',
  },
  fabWrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
  fabBtn: {
    borderRadius: radii.button + 2,
    backgroundColor: colors.secondary,
    ...shadows.card,
  },
  fabContent: {
    minHeight: 50,
  },
});
