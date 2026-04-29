import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';

import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, spacing } from '@/constants';
import { colors } from '@/constants/Colors';
import { useLoginMutation } from '@/hooks/useLoginMutation';
import { isValidPhoneOrEmail } from '@/utils';

export default function LoginScreen() {
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const login = useLoginMutation();

  useEffect(() => {
    login.reset();
    setSubmitError(null);
  }, [phoneOrEmail, password]);

  const identifierError =
    phoneOrEmail.length > 0 && !isValidPhoneOrEmail(phoneOrEmail)
      ? 'Enter a valid email or phone number (10+ digits)'
      : '';

  const canSubmit =
    isValidPhoneOrEmail(phoneOrEmail) &&
    password.length >= 1 &&
    !login.isPending;

  function onSubmit() {
    if (!canSubmit) return;
    setSubmitError(null);
    login.mutate(
      { phoneOrEmail: phoneOrEmail.trim(), password },
      {
        onSuccess: () => {
          router.replace('/home');
        },
        onError: (err) => {
          setSubmitError(
            err instanceof Error
              ? err.message
              : 'Sign-in failed. Try again.',
          );
        },
      },
    );
  }

  return (
    <>
    <AuthScaffold
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

      {submitError ? (
        <HelperText type="error" visible style={styles.submitError}>
          {submitError}
        </HelperText>
      ) : null}

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
  submitError: {
    marginBottom: spacing.sm,
  },
  primaryBtn: {
    marginTop: spacing.md,
  },
  secondaryBtn: {
    marginTop: spacing.xl + spacing.sm,
  },
});
