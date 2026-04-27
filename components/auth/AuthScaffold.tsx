import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { BrandLogoMark } from '@/components/ClinicLogo';
import { APP_NAME, radii, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';

/** Deep blue → teal (royal / clinical, similar to reference). */
const AUTH_GRADIENT = ['#0a1f33', '#0f3d5c', '#156b8a', '#1a7a8f'] as const;

const CARD_TOP_RADIUS = 26;

type Props = {
  cardTitle: string;
  cardSubtitle: string;
  children: ReactNode;
  /** Row on blue band below white card (e.g. sign up / sign in link). */
  footer: ReactNode;
  /** Optional back control above logo (register from login stack). */
  headerAccessory?: ReactNode;
};

/**
 * Shared layout: gradient hero, brand row, large white card (rounded top), bottom link strip.
 */
export function AuthScaffold({
  cardTitle,
  cardSubtitle,
  children,
  footer,
  headerAccessory,
}: Props) {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[...AUTH_GRADIENT]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <View style={styles.column}>
            {headerAccessory ? (
              <View style={styles.accessory}>{headerAccessory}</View>
            ) : null}

            <View style={styles.brandRow}>
              <BrandLogoMark size={52} padded />
              <AuthWordmark />
            </View>

            <View style={styles.cardShell}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.cardScroll}>
                <Text style={styles.cardTitle}>{cardTitle}</Text>
                <Text style={styles.cardSubtitle}>{cardSubtitle}</Text>
                {children}
                <View style={styles.cardFooterBrand}>
                  <MaterialCommunityIcons
                    name="medical-bag"
                    size={14}
                    color={colors.textMuted}
                  />
                  <Text style={styles.cardFooterText}>{APP_NAME}</Text>
                </View>
              </ScrollView>
            </View>

            <View style={styles.bottomStrip}>{footer}</View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export function AuthWordmark() {
  const words = APP_NAME.trim().split(/\s+/);
  const first = words[0] ?? APP_NAME;
  const rest = words.slice(1).join(' ');

  return (
    <View style={styles.wordmark}>
      <Text style={styles.wordFirst}>{first}</Text>
      {rest ? (
        <Text style={styles.wordRest}>
          {' '}
          {rest}
        </Text>
      ) : null}
    </View>
  );
}

export function AuthBackLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.backRow, pressed && styles.backPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <MaterialCommunityIcons
        name="chevron-left"
        size={22}
        color="rgba(255,255,255,0.92)"
      />
      <Text style={styles.backText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AUTH_GRADIENT[0],
  },
  safe: { flex: 1 },
  flex: { flex: 1 },
  column: {
    flex: 1,
  },
  accessory: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  brandRow: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  wordmark: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  wordFirst: {
    fontSize: 26,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: 0.3,
  },
  wordRest: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.2,
  },
  cardShell: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: CARD_TOP_RADIUS,
    borderTopRightRadius: CARD_TOP_RADIUS,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  cardScroll: {
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    ...typography.subtitle,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontSize: 15,
  },
  cardFooterBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xl,
    opacity: 0.75,
  },
  cardFooterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  bottomStrip: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
  },
  backPressed: { opacity: 0.75 },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },
});
