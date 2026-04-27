import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Avatar,
  Button,
  Card,
  List,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { BrandLogoMark } from '@/components/ClinicLogo';
import { APP_NAME, clinicScreen, radii, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { useAuthStore } from '@/store';
import { clearAllPersistedAppState } from '@/utils/clearAppPersistence';

const HERO_COLORS = ['#2ebdb4', '#3d9fff', '#1d4ed8'] as const;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

export default function ProfileScreen() {
  const clinic = useAuthStore((s) => s.clinic);
  const user = useAuthStore((s) => s.user);
  const [loggingOut, setLoggingOut] = useState(false);

  const staffName =
    user?.name ??
    clinic?.contactName ??
    (clinic?.name ? 'Clinic staff' : 'Guest');
  const clinicName = clinic?.name ?? 'Not linked';
  const phone = clinic?.phone ?? user?.phone ?? 'Not set';
  const email = user?.email ?? '—';

  async function onLogout() {
    setLoggingOut(true);
    try {
      await clearAllPersistedAppState();
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[...HERO_COLORS]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <View style={styles.heroLogoWrap}>
            <BrandLogoMark size={88} padded />
          </View>
          <Text variant="headlineSmall" style={styles.heroApp}>
            {APP_NAME}
          </Text>
          <Text variant="bodyLarge" style={styles.heroTag}>
            
          </Text>
        </LinearGradient>

        <View style={styles.overlapZone}>
          <Card style={[clinicScreen.card, styles.identityCard]} mode="elevated">
            <Card.Content style={styles.identityInner}>
              <View style={styles.avatarRing}>
                <Avatar.Text
                  size={96}
                  label={initialsFor(staffName)}
                  style={styles.avatar}
                  labelStyle={styles.avatarLabel}
                />
              </View>
              <Text variant="headlineSmall" style={styles.name} numberOfLines={2}>
                {staffName}
              </Text>
              <Text variant="bodyMedium" style={styles.roleHint}>
                Signed in as clinic staff
              </Text>
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
              </List.Section>
            </Card.Content>
          </Card>

          <View style={styles.actions}>
            <Button
              mode="outlined"
              icon="account-edit"
              onPress={() => {}}
              disabled
              style={styles.actionBtn}
              contentStyle={clinicScreen.buttonContent}>
              Edit profile
            </Button>
            <Text variant="bodySmall" style={styles.editHint}>
              Updates are managed by your clinic administrator.
            </Text>
            <Button
              mode="contained"
              icon="logout"
              onPress={() => void onLogout()}
              loading={loggingOut}
              disabled={loggingOut}
              style={[clinicScreen.button, styles.logoutBtn]}
              contentStyle={clinicScreen.buttonContent}
              buttonColor={colors.error}
              textColor={colors.onPrimary}>
              Log out
            </Button>
          </View>
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
  scroll: {
    paddingBottom: spacing.xl * 2,
  },
  hero: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl * 2.2,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
  },
  heroLogoWrap: {
    marginBottom: spacing.md,
  },
  heroApp: {
    color: colors.onPrimary,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  heroTag: {
    color: colors.onPrimary,
    opacity: 0.92,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  overlapZone: {
    marginTop: -56,
    paddingHorizontal: spacing.lg,
  },
  identityCard: {
    marginBottom: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  identityInner: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  avatarRing: {
    marginBottom: spacing.md,
    borderRadius: 56,
    padding: 4,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatar: {
    backgroundColor: colors.surfaceVariant,
  },
  avatarLabel: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.secondary,
  },
  name: {
    textAlign: 'center',
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  roleHint: {
    textAlign: 'center',
    color: colors.textMuted,
  },
  infoCard: {
    marginBottom: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  infoCardContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
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
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    borderColor: colors.border,
    borderRadius: radii.button,
  },
  editHint: {
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    lineHeight: 20,
  },
  logoutBtn: {
    borderRadius: radii.button,
  },
});
