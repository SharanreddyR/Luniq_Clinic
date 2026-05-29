import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';

import {
  AuthScaffold,
  authInputOutline,
} from '@/components/auth/AuthScaffold';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, radii, spacing } from '@/constants';
import { colors } from '@/constants/Colors';
import { useLoginMutation } from '@/hooks/useLoginMutation';
import {
  LOGIN_INVALID_CREDENTIALS_MESSAGE,
  LOGIN_WRONG_APP_ROLE_MESSAGE,
} from '@/services/authService';
import { isValidPhoneOrEmail } from '@/utils';

const SCROLL_TOP_PADDING = 20;

export default function LoginScreen() {
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);

  const authScrollRef = useRef<ScrollView>(null);
  const passwordBlockY = useRef(0);

  const login = useLoginMutation();

  const scrollPasswordIntoView = useCallback(() => {
    const scroll = () => {
      const y = passwordBlockY.current;
      authScrollRef.current?.scrollTo({
        y: Math.max(0, y - SCROLL_TOP_PADDING),
        animated: true,
      });
    };
    requestAnimationFrame(scroll);
    setTimeout(scroll, 100);
    setTimeout(scroll, 280);
  }, []);

  useEffect(() => {
    login.reset();
  }, [phoneOrEmail, password]);

  const identifierError =
    phoneOrEmail.length > 0 && !isValidPhoneOrEmail(phoneOrEmail)
      ? 'Enter a valid email or a 10-digit phone number'
      : '';

  const canSubmit =
    isValidPhoneOrEmail(phoneOrEmail) &&
    password.length >= 1 &&
    !login.isPending;

  function onSubmit() {
    if (!canSubmit) return;
    login.mutate(
      { phoneOrEmail: phoneOrEmail.trim(), password },
      {
        onSuccess: () => {
          router.replace('/home');
        },
        onError: (err) => {
          const msg =
            err instanceof Error ? err.message : 'Sign-in failed. Try again.';
          const lower = msg.toLowerCase();
          const isDeactivated = lower.includes('deactivated');
          const isWrongApp =
            msg === LOGIN_WRONG_APP_ROLE_MESSAGE ||
            lower.includes('luniq care card');
          const isCredentialFailure =
            msg === LOGIN_INVALID_CREDENTIALS_MESSAGE ||
            lower.includes('invalid credential') ||
            lower.includes('unauthenticated') ||
            lower.includes('credentials do not match') ||
            lower.includes('validation failed') ||
            /something went wrong|went wrong.*try again/i.test(msg);
          if (isDeactivated) {
            Alert.alert('Unable to sign in', msg);
            return;
          }
          if (isWrongApp) {
            Alert.alert('Use Luniq Care Card', msg);
            return;
          }
          if (isCredentialFailure) {
            Alert.alert(
              LOGIN_INVALID_CREDENTIALS_MESSAGE,
              'Please check your email or password and try again.',
            );
            return;
          }
          Alert.alert('Sign-in failed', msg);
        },
      },
    );
  }

  return (
    <>
      <AuthScaffold
        ref={authScrollRef}
        cardKicker="Welcome back"
        cardTitle="Sign in"
        cardSubtitle="Use your clinic partner credentials to open the dashboard, record visits, and manage claims.">
        <TextInput
          mode="outlined"
          label="Phone or email"
          value={phoneOrEmail}
          onChangeText={setPhoneOrEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="username"
          textContentType="username"
          style={styles.input}
          {...authInputOutline}
          left={
            <TextInput.Icon icon="account-outline" color={colors.textMuted} />
          }
          error={!!identifierError}
          disabled={login.isPending}
        />
        <HelperText type="error" visible={!!identifierError}>
          {identifierError}
        </HelperText>

        <View
          collapsable={false}
          onLayout={(e) => {
            passwordBlockY.current = e.nativeEvent.layout.y;
          }}>
          <TextInput
            mode="outlined"
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={secure}
            autoComplete="password"
            textContentType="password"
            style={styles.inputSpaced}
            {...authInputOutline}
            left={<TextInput.Icon icon="lock-outline" color={colors.textMuted} />}
            disabled={login.isPending}
            onFocus={scrollPasswordIntoView}
            right={
              <TextInput.Icon
                icon={secure ? 'eye-off' : 'eye'}
                disabled={login.isPending}
                onPress={() => {
                  if (!login.isPending) setSecure((s) => !s);
                }}
              />
            }
          />
        </View>

        <Button
          mode="contained"
          onPress={onSubmit}
          loading={login.isPending}
          disabled={!canSubmit}
          buttonColor={colors.secondary}
          textColor={colors.onPrimary}
          style={[clinicScreen.button, styles.primaryBtn]}
          contentStyle={styles.primaryBtnContent}
          labelStyle={styles.primaryBtnLabel}>
          Sign in to dashboard
        </Button>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text variant="labelSmall" style={styles.dividerText}>
            New clinic partner?
          </Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          mode="outlined"
          disabled={login.isPending}
          textColor={colors.secondary}
          style={[clinicScreen.button, styles.secondaryBtn]}
          contentStyle={clinicScreen.buttonContent}
          onPress={() => router.push('/register')}>
          Apply for registration
        </Button>
        <Text variant="bodySmall" style={styles.registerHint}>
          Submit your clinic details for review. We usually respond within 2–3
          business days.
        </Text>
      </AuthScaffold>
      <LoadingOverlay visible={login.isPending} message="Signing you in…" />
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
  },
  inputSpaced: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
  },
  primaryBtn: {
    marginTop: spacing.lg,
    borderRadius: radii.button,
  },
  primaryBtnContent: {
    minHeight: 52,
  },
  primaryBtnLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    borderColor: colors.secondary,
    borderWidth: 1.5,
  },
  registerHint: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
  },
});
