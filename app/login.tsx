import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';

import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, spacing } from '@/constants';
import { colors } from '@/constants/Colors';
import { useLoginMutation } from '@/hooks/useLoginMutation';
import { LOGIN_INVALID_CREDENTIALS_MESSAGE } from '@/services/authService';
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
    setTimeout(scroll, 520);
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
      cardTitle="Login"
      cardSubtitle="Sign in to continue to your clinic dashboard."
      footer={null}>
      <TextInput
        mode="flat"
        label="Phone or email"
        value={phoneOrEmail}
        onChangeText={setPhoneOrEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="username"
        textContentType="username"
        style={styles.input}
        underlineColor={colors.border}
        activeUnderlineColor={colors.primary}
        left={<TextInput.Icon icon="account-outline" color={colors.textMuted} />}
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
          mode="flat"
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secure}
          autoComplete="password"
          textContentType="password"
          style={styles.inputSpaced}
          underlineColor={colors.border}
          activeUnderlineColor={colors.primary}
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
        contentStyle={clinicScreen.buttonContent}>
        Sign in
      </Button>

      <Button
        mode="contained"
        disabled={login.isPending}
        buttonColor={colors.primary}
        textColor={colors.onPrimary}
        style={[clinicScreen.button, styles.secondaryBtn]}
        contentStyle={clinicScreen.buttonContent}
        onPress={() => router.push('/register')}>
        Request for Registration
      </Button>
    </AuthScaffold>
    <LoadingOverlay visible={login.isPending} message="Signing you in…" />
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: 'transparent',
    marginBottom: 0,
  },
  inputSpaced: {
    backgroundColor: 'transparent',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  primaryBtn: {
    marginTop: spacing.md,
  },
  secondaryBtn: {
    marginTop: spacing.xl + spacing.sm,
  },
});
