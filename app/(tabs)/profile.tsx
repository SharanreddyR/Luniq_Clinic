import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  Avatar,
  Button,
  Card,
  Dialog,
  List,
  Portal,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';

import { BrandLogoMark } from '@/components/ClinicLogo';
import { clinicScreen, radii, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { useClinicProfile } from '@/hooks/useClinicProfile';
import { completeClinicSetup } from '@/services/clinicSetupServicesService';
import { useAuthStore } from '@/store';
import { clearAllPersistedAppState } from '@/utils/clearAppPersistence';

const HERO_COLORS = ['#0B6B6D', '#1A9B98', '#40B9AE'] as const;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const clinic = useAuthStore((s) => s.clinic);
  const user = useAuthStore((s) => s.user);
  const clinicProfileQuery = useClinicProfile();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [goLiveSubmitting, setGoLiveSubmitting] = useState(false);
  const [goLiveDialog, setGoLiveDialog] = useState<{
    visible: boolean;
    message: string;
    isError: boolean;
  }>({ visible: false, message: '', isError: false });

  const remote = clinicProfileQuery.data;
  const staffName =
    remote?.contactName ||
    user?.name ||
    clinic?.contactName ||
    (clinic?.name ? 'Clinic staff' : 'Guest');
  const clinicName = remote?.clinicName || clinic?.name || 'Not linked';
  const phone = remote?.phone || clinic?.phone || user?.phone || 'Not set';
  const email = remote?.email || user?.email || '—';
  const addressLine = [remote?.address, remote?.city, remote?.state, remote?.pincode]
    .filter((x): x is string => Boolean(x && x.trim()))
    .join(', ');
  const stats = [
    {
      key: 'appointments',
      label: 'Appointments',
      value: remote ? 'Synced' : 'Pending',
      icon: 'calendar-check-outline' as const,
    },
    {
      key: 'reports',
      label: 'Reports',
      value: remote ? 'Ready' : 'Not linked',
      icon: 'file-document-check-outline' as const,
    },
    {
      key: 'account',
      label: 'Account',
      value: clinicName !== 'Not linked' ? 'Active' : 'Guest',
      icon: 'shield-check-outline' as const,
    },
  ];

  async function confirmLogout() {
    setLoggingOut(true);
    try {
      await clearAllPersistedAppState();
      setLogoutDialogVisible(false);
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  async function onGoLive() {
    if (goLiveSubmitting) return;
    setGoLiveSubmitting(true);
    try {
      const { message } = await completeClinicSetup();
      setGoLiveDialog({ visible: true, message, isError: false });
      void queryClient.invalidateQueries({ queryKey: ['clinic-profile'] });
    } catch (e) {
      const message =
        e instanceof Error && e.message.trim()
          ? e.message.trim()
          : 'Could not complete setup.';
      setGoLiveDialog({ visible: true, message, isError: true });
    } finally {
      setGoLiveSubmitting(false);
    }
  }

  return (
    <>
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[...HERO_COLORS]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <View style={styles.heroTopBar}>
            <Pressable
              style={({ pressed }) => [
                styles.heroIconChip,
                pressed && styles.heroIconChipPressed,
              ]}
              onPress={() => setLogoutDialogVisible(true)}
              disabled={loggingOut}
              accessibilityRole="button"
              accessibilityLabel="Log out">
              <MaterialCommunityIcons
                name="logout"
                size={22}
                color={colors.onPrimary}
              />
            </Pressable>
            <View style={styles.heroBrandMark}>
              <BrandLogoMark size={22} padded />
            </View>
          </View>
          <View style={styles.heroProfileRow}>
            <View style={styles.heroAvatarRing}>
              <Avatar.Text
                size={84}
                label={initialsFor(staffName)}
                style={styles.heroAvatar}
                labelStyle={styles.heroAvatarLabel}
              />
            </View>
            <View style={styles.heroProfileTexts}>
              <Text variant="labelLarge" style={styles.heroProfileKicker}>
                Your profile
              </Text>
              <Text variant="headlineSmall" style={styles.heroName} numberOfLines={2}>
                {staffName}
              </Text>
              <Text variant="bodyMedium" style={styles.heroRole}>
                Signed in as clinic staff
              </Text>
              <Text variant="labelMedium" style={styles.heroClinic} numberOfLines={2}>
                {clinicName}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.overlapZone}>
          <Card style={[clinicScreen.card, styles.identityCard]} mode="elevated">
            <Card.Content style={styles.identityInner}>
              <Text variant="titleMedium" style={styles.overviewTitle}>
                Overview
              </Text>
              <View style={styles.statsRow}>
                {stats.map((item) => (
                  <View key={item.key} style={styles.statCard}>
                    <View style={styles.statIconWrap}>
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <Text variant="labelSmall" style={styles.statLabel}>
                      {item.label}
                    </Text>
                    <Text variant="titleSmall" style={styles.statValue}>
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>

          <Card style={[clinicScreen.card, styles.infoCard]} mode="elevated">
            <Card.Content style={styles.infoCardContent}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Account
              </Text>
              <List.Section style={styles.listSection}>
                <List.Item
                  title="Clinic"
                  description={clinicName}
                  descriptionNumberOfLines={3}
                  titleStyle={styles.listTitle}
                  descriptionStyle={styles.listDesc}
                  left={() => (
                    <View style={styles.rowIcon}>
                      <MaterialCommunityIcons
                        name="hospital-building"
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                  )}
                />
                <List.Item
                  title="Phone"
                  description={phone}
                  titleStyle={styles.listTitle}
                  descriptionStyle={styles.listDesc}
                  left={() => (
                    <View style={styles.rowIcon}>
                      <MaterialCommunityIcons
                        name="phone"
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                  )}
                />
                <List.Item
                  title="Email"
                  description={email}
                  titleStyle={styles.listTitle}
                  descriptionStyle={styles.listDesc}
                  left={() => (
                    <View style={styles.rowIcon}>
                      <MaterialCommunityIcons
                        name="email-outline"
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                  )}
                />
                {addressLine ? (
                  <List.Item
                    title="Address"
                    description={addressLine}
                    descriptionNumberOfLines={3}
                    titleStyle={styles.listTitle}
                    descriptionStyle={styles.listDesc}
                    left={() => (
                      <View style={styles.rowIcon}>
                        <MaterialCommunityIcons
                          name="map-marker-outline"
                          size={22}
                          color={colors.primary}
                        />
                      </View>
                    )}
                  />
                ) : null}
              </List.Section>
              {!clinicProfileQuery.isFetching && !remote ? (
                <Text variant="bodySmall" style={styles.notFoundText}>
                  Data not found.
                </Text>
              ) : null}
              {clinicProfileQuery.isFetching ? (
                <Text variant="bodySmall" style={styles.fetchHint}>
                  Refreshing profile from server…
                </Text>
              ) : null}
            </Card.Content>
          </Card>

          <Card style={[clinicScreen.card, styles.infoCard]} mode="elevated">
            <Card.Content style={styles.infoCardContent}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Quick actions
              </Text>
              <List.Section style={styles.listSection}>
                <List.Item
                  title="Go live"
                  description="Finish setup so your clinic appears to patients on Luniq"
                  titleStyle={styles.listTitle}
                  descriptionStyle={styles.listDesc}
                  onPress={() => void onGoLive()}
                  disabled={goLiveSubmitting}
                  left={() => (
                    <View style={styles.rowIcon}>
                      <MaterialCommunityIcons
                        name="rocket-launch-outline"
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                  )}
                  right={() =>
                    goLiveSubmitting ? (
                      <View style={styles.goLiveRight}>
                        <Text variant="labelSmall" style={styles.goLiveWorking}>
                          Working…
                        </Text>
                      </View>
                    ) : undefined
                  }
                />
                <List.Item
                  title="Appointments"
                  description="Manage upcoming visits and follow-ups"
                  titleStyle={styles.listTitle}
                  descriptionStyle={styles.listDesc}
                  onPress={() => router.push('/appointments' as Href)}
                  left={() => (
                    <View style={styles.rowIcon}>
                      <MaterialCommunityIcons
                        name="calendar-month-outline"
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                  )}
                />
                <List.Item
                  title="Reports"
                  description="View and export patient health reports"
                  titleStyle={styles.listTitle}
                  descriptionStyle={styles.listDesc}
                  onPress={() => router.push('/reports' as Href)}
                  left={() => (
                    <View style={styles.rowIcon}>
                      <MaterialCommunityIcons
                        name="file-chart-outline"
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                  )}
                />
                <List.Item
                  title="Settings"
                  description="Update preferences and security controls"
                  titleStyle={styles.listTitle}
                  descriptionStyle={styles.listDesc}
                  onPress={() => router.push('/clinic-settings' as Href)}
                  left={() => (
                    <View style={styles.rowIcon}>
                      <MaterialCommunityIcons
                        name="cog-outline"
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                  )}
                />
              </List.Section>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>

    <Portal>
      <Dialog
        visible={goLiveDialog.visible}
        onDismiss={() => setGoLiveDialog((s) => ({ ...s, visible: false }))}
        dismissable
        style={styles.logoutDialog}>
        <Dialog.Title style={goLiveDialog.isError ? styles.goLiveTitleErr : undefined}>
          {goLiveDialog.isError ? 'Go live' : 'Clinic is live'}
        </Dialog.Title>
        <Dialog.Content>
          <Text
            variant="bodyMedium"
            style={[
              styles.logoutDialogBody,
              goLiveDialog.isError && styles.goLiveBodyErr,
            ]}>
            {goLiveDialog.message}
          </Text>
        </Dialog.Content>
        <Dialog.Actions style={styles.logoutDialogActions}>
          <Button
            mode="contained"
            onPress={() => setGoLiveDialog((s) => ({ ...s, visible: false }))}
            buttonColor={colors.primary}
            textColor={colors.onPrimary}>
            OK
          </Button>
        </Dialog.Actions>
      </Dialog>
      <Dialog
        visible={logoutDialogVisible}
        onDismiss={() => {
          if (!loggingOut) setLogoutDialogVisible(false);
        }}
        dismissable={!loggingOut}
        style={styles.logoutDialog}>
        <Dialog.Title>Log out?</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.logoutDialogBody}>
            You will need to sign in again to access your clinic dashboard.
          </Text>
        </Dialog.Content>
        <Dialog.Actions style={styles.logoutDialogActions}>
          <Button
            mode="outlined"
            onPress={() => setLogoutDialogVisible(false)}
            disabled={loggingOut}
            textColor={colors.secondary}
            style={styles.logoutDialogCancel}>
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={() => void confirmLogout()}
            loading={loggingOut}
            disabled={loggingOut}
            buttonColor={colors.error}
            textColor={colors.onPrimary}>
            Log out
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingBottom: spacing.xl * 2,
  },
  hero: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
  },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  heroIconChip: {
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  heroIconChipPressed: {
    opacity: 0.88,
  },
  heroBrandMark: {
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  heroAvatarRing: {
    borderRadius: 48,
    padding: 3,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  heroAvatar: {
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  heroAvatarLabel: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  heroProfileTexts: {
    flex: 1,
    minWidth: 0,
  },
  heroProfileKicker: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontSize: 11,
    marginBottom: 4,
  },
  heroName: {
    color: colors.onPrimary,
    fontWeight: '700',
    lineHeight: 30,
  },
  heroRole: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  heroClinic: {
    color: 'rgba(255,255,255,0.82)',
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  overlapZone: {
    marginTop: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  identityCard: {
    marginBottom: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 3,
  },
  identityInner: {
    paddingVertical: spacing.md,
  },
  overviewTitle: {
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 0,
  },
  statCard: {
    flex: 1,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceVariant,
    marginBottom: spacing.xs / 2,
  },
  statLabel: {
    color: colors.textMuted,
    marginBottom: spacing.xs / 2,
  },
  statValue: {
    color: colors.secondary,
    fontWeight: '700',
  },
  infoCard: {
    marginBottom: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  infoCardContent: {
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: spacing.xs,
    marginLeft: spacing.sm,
  },
  listSection: {
    marginVertical: 0,
    paddingHorizontal: 0,
  },
  listTitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  listDesc: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  fetchHint: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
    marginBottom: spacing.sm,
  },
  notFoundText: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
    marginBottom: spacing.xs,
  },
  logoutDialog: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    marginHorizontal: spacing.lg,
  },
  logoutDialogBody: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  logoutDialogActions: {
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  logoutDialogCancel: {
    borderColor: colors.border,
  },
  goLiveRight: {
    justifyContent: 'center',
    paddingRight: spacing.xs,
  },
  goLiveWorking: {
    color: colors.textMuted,
  },
  goLiveTitleErr: {
    color: colors.error,
  },
  goLiveBodyErr: {
    color: colors.secondary,
  },
});
