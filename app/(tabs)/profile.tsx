import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Divider, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { clinicScreen, colors, spacing, typography } from '@/constants';
import { useAppToast } from '@/hooks/useAppToast';
import { useAuthStore } from '@/store';
import { clearAllPersistedAppState } from '@/utils/clearAppPersistence';

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
  const { showSuccess } = useAppToast();

  const staffName =
    user?.name ??
    clinic?.contactName ??
    (clinic?.name ? 'Clinic staff' : 'Guest');
  const clinicName = clinic?.name ?? '—';
  const phone =
    clinic?.phone ?? user?.phone ?? 'Not set';

  async function onLogout() {
    setLoggingOut(true);
    try {
      await clearAllPersistedAppState();
      showSuccess('Signed out successfully.');
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
        showsVerticalScrollIndicator={false}>
        <Text variant="headlineSmall" style={styles.screenTitle}>
          Profile
        </Text>

        <Card style={clinicScreen.card} mode="elevated">
          <Card.Content style={styles.cardInner}>
            <View style={styles.avatarWrap}>
              <Avatar.Text
                size={104}
                label={initialsFor(staffName)}
                style={styles.avatar}
                labelStyle={styles.avatarLabel}
              />
            </View>

            <Text variant="headlineSmall" style={styles.name} numberOfLines={2}>
              {staffName}
            </Text>

            <View style={styles.meta}>
              <Text style={styles.metaLabel}>Clinic</Text>
              <Text style={styles.metaValue} numberOfLines={2}>
                {clinicName}
              </Text>

              <Text style={[styles.metaLabel, styles.metaLabelSpaced]}>
                Phone
              </Text>
              <Text style={styles.metaValue}>{phone}</Text>
            </View>

            <Divider style={styles.divider} />

            <Button
              mode="outlined"
              onPress={() => {}}
              disabled={loggingOut}
              style={[clinicScreen.button, styles.editBtn]}
              contentStyle={clinicScreen.buttonContent}
              textColor={colors.secondary}>
              Edit profile
            </Button>

            <Button
              mode="contained"
              onPress={() => void onLogout()}
              loading={loggingOut}
              disabled={loggingOut}
              style={[clinicScreen.button, styles.logoutBtn]}
              contentStyle={clinicScreen.buttonContent}
              buttonColor={colors.error}
              textColor={colors.onPrimary}>
              Log out
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
    paddingBottom: spacing.xl,
  },
  screenTitle: {
    ...typography.title,
    fontSize: 20,
    marginBottom: spacing.lg,
  },
  cardInner: {
    paddingVertical: spacing.md,
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.accent,
  },
  avatarLabel: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  name: {
    ...typography.title,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: colors.secondary,
  },
  meta: {
    width: '100%',
    paddingHorizontal: spacing.xs,
  },
  metaLabel: {
    ...typography.small,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs / 2,
  },
  metaLabelSpaced: {
    marginTop: spacing.md,
  },
  metaValue: {
    ...typography.subtitle,
    color: colors.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    marginVertical: spacing.lg,
    backgroundColor: colors.border,
  },
  editBtn: {
    marginBottom: spacing.md,
    borderColor: colors.secondary,
  },
  logoutBtn: {
    marginBottom: 0,
  },
});
