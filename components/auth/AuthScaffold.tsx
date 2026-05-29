import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { forwardRef, useEffect, useState, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogoMark } from '@/components/ClinicLogo';
import { radii, shadows, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';

/** Matches dashboard / profile hero */
export const AUTH_GRADIENT = ['#0A5257', '#146D70', '#22B8AE'] as const;

const CARD_TOP_RADIUS = 28;

export const authInputOutline = {
  outlineColor: colors.border,
  activeOutlineColor: colors.primary,
  outlineStyle: { borderRadius: radii.sm } as const,
};

export type AuthScaffoldProps = {
  cardTitle: string;
  cardSubtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  headerAccessory?: ReactNode;
  /** Short label above title, e.g. "CLINIC PORTAL" */
  cardKicker?: string;
};

export const AuthScaffold = forwardRef<ScrollView, AuthScaffoldProps>(
  function AuthScaffold(
    {
      cardTitle,
      cardSubtitle,
      children,
      footer,
      headerAccessory,
      cardKicker = 'CLINIC PORTAL',
    },
    ref,
  ) {
    const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);

    useEffect(() => {
      const showEvent =
        Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
      const hideEvent =
        Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

      const onShow = (e: { endCoordinates: { height: number } }) => {
        setKeyboardBottomInset(e.endCoordinates.height);
      };
      const onHide = () => setKeyboardBottomInset(0);

      const subShow = Keyboard.addListener(showEvent, onShow);
      const subHide = Keyboard.addListener(hideEvent, onHide);
      return () => {
        subShow.remove();
        subHide.remove();
      };
    }, []);

    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <LinearGradient
          colors={[...AUTH_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.orbTop} pointerEvents="none" />
        <View style={styles.orbBottom} pointerEvents="none" />

        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.flex}>
            <View style={styles.column}>
              {headerAccessory ? (
                <View style={styles.accessory}>{headerAccessory}</View>
              ) : null}

              <View style={styles.brandRow}>
                <View style={styles.logoFrame}>
                  <BrandLogoMark size={56} padded={false} />
                </View>
                <Text style={styles.welcomeHeading}>Luniq Clinic</Text>
              </View>

              <View style={styles.cardShell}>
                <View style={styles.cardAccent} />
                <ScrollView
                  ref={ref}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.cardScroll,
                    {
                      paddingBottom:
                        spacing.xl +
                        keyboardBottomInset +
                        (Platform.OS === 'android' ? spacing.lg : spacing.md),
                    },
                  ]}>
                  <Text style={styles.cardKicker}>{cardKicker}</Text>
                  <Text style={styles.cardTitle}>{cardTitle}</Text>
                  <Text style={styles.cardSubtitle}>{cardSubtitle}</Text>
                  {children}
                  <View style={styles.trustRow}>
                    <MaterialCommunityIcons
                      name="shield-check-outline"
                      size={16}
                      color={colors.success}
                    />
                    <Text style={styles.trustText}>
                      Secure sign-in for verified clinic partners
                    </Text>
                  </View>
                </ScrollView>
              </View>

              {footer ? <View style={styles.footerStrip}>{footer}</View> : null}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  },
);

export function AuthSectionTitle({
  title,
  icon,
}: {
  title: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={colors.primary}
        />
      ) : null}
      <Text style={styles.sectionTitle}>{title}</Text>
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
        size={24}
        color="rgba(255,255,255,0.95)"
      />
      <Text style={styles.backText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  orbTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(34, 184, 174, 0.18)',
  },
  orbBottom: {
    position: 'absolute',
    bottom: 120,
    left: -90,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(196, 245, 66, 0.1)',
  },
  safe: { flex: 1 },
  flex: { flex: 1 },
  column: {
    flex: 1,
  },
  accessory: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  brandRow: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  logoFrame: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  welcomeHeading: {
    marginTop: spacing.md,
    fontSize: 28,
    fontWeight: '800',
    color: colors.onPrimary,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  cardShell: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: CARD_TOP_RADIUS,
    borderTopRightRadius: CARD_TOP_RADIUS,
    overflow: 'hidden',
    ...shadows.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  cardAccent: {
    height: 4,
    backgroundColor: colors.primary,
    width: '100%',
  },
  cardScroll: {
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.lg,
  },
  cardKicker: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.secondary,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    ...typography.subtitle,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontSize: 15,
    lineHeight: 22,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.secondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  trustText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  footerStrip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
