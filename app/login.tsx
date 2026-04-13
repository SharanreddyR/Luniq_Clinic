import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  Card,
  HelperText,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { ClinicLogo } from '@/components/ClinicLogo';
import { clinicScreen, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { useAppToast } from '@/hooks/useAppToast';
import { useLoginMutation } from '@/hooks/useLoginMutation';
import { isValidPhoneOrEmail } from '@/utils';

export default function LoginScreen() {
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);

  const login = useLoginMutation();
  const { showError, showSuccess } = useAppToast();

  useEffect(() => {
    login.reset();
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
    login.mutate(
      { phoneOrEmail: phoneOrEmail.trim(), password },
      {
        onSuccess: () => {
          showSuccess('Signed in. Welcome back.');
          router.replace('/home');
        },
        onError: (err) => {
          showError(
            err instanceof Error
              ? err.message
              : 'Sign-in failed. Try again.',
          );
        },
      },
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ClinicLogo compact />
          <Text variant="headlineSmall" style={styles.heading}>
            Clinic login
          </Text>
          <Text variant="bodyMedium" style={styles.hint}>
            Sign in with your phone or email and password
          </Text>

          <Card style={clinicScreen.card} mode="elevated">
            <Card.Content>
          <TextInput
            label="Phone or email"
            value={phoneOrEmail}
            onChangeText={setPhoneOrEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="username"
            textContentType="username"
            style={styles.input}
            error={!!identifierError}
            disabled={login.isPending}
          />
          <HelperText type="error" visible={!!identifierError}>
            {identifierError}
          </HelperText>

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={secure}
            autoComplete="password"
            textContentType="password"
            style={styles.input}
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

          <Button
            mode="contained"
            onPress={onSubmit}
            loading={login.isPending}
            disabled={!canSubmit}
            style={[clinicScreen.button, styles.button]}
            contentStyle={clinicScreen.buttonContent}>
            Sign in to dashboard
          </Button>
            </Card.Content>
          </Card>

          <View style={styles.footer}>
            <Text variant="bodyMedium" style={styles.footerText}>
              Need to register your clinic?{' '}
            </Text>
            <Link href="/register" asChild>
              <Pressable hitSlop={8} disabled={login.isPending}>
                <Text style={styles.link}>Create an account</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <LoadingOverlay
        visible={login.isPending}
        message="Signing you in…"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  heading: {
    ...typography.title,
    marginBottom: spacing.xs,
  },
  hint: {
    ...typography.subtitle,
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: 0,
    backgroundColor: colors.surface,
  },
  button: {
    marginTop: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
    flexWrap: 'wrap',
  },
  footerText: {
    ...typography.subtitle,
  },
  link: {
    color: colors.primary,
    fontWeight: '600',
  },
});
