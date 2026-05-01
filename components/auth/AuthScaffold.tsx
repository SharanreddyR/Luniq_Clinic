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
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { BrandLogoMark } from '@/components/ClinicLogo';
import { APP_NAME, radii, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';

/** Teal clinical gradient aligned with app shell. */
const AUTH_GRADIENT = ['#0B6B6D', '#1A9B98', '#40B9AE'] as const;

const CARD_TOP_RADIUS = 26;

export type AuthScaffoldProps = {
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
 * Forward `ref` to the inner `ScrollView` so screens can scroll focused fields into view.
 */
export const AuthScaffold = forwardRef<ScrollView, AuthScaffoldProps>(
  function AuthScaffold(
    {
      cardTitle,
      cardSubtitle,
      children,
      footer,
      headerAccessory,
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
      <StatusBar style="dark" />
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
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
});

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
    backgroundColor: '#0B6B6D',
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
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.3,
  },
  wordRest: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
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
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
    borderTopWidth: 1,
    borderColor: '#D6EAE8',
  },
  cardScroll: {
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.xl,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.secondary,
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
    color: '#FFFFFF',
  },
});
