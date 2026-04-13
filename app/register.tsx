import { Link, useRouter } from 'expo-router';
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
  Appbar,
  Button,
  Card,
  Divider,
  HelperText,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { ClinicLogo } from '@/components/ClinicLogo';
import { APP_NAME, clinicScreen, colors, spacing, typography } from '@/constants';
import { useAppToast } from '@/hooks/useAppToast';
import { useRegisterMutation } from '@/hooks/useRegisterMutation';
import { isValidEmail } from '@/utils';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [secure, setSecure] = useState(true);

  const register = useRegisterMutation();
  const { showError, showSuccess } = useAppToast();

  useEffect(() => {
    register.reset();
  }, [name, email, password, clinicName, clinicAddress]);

  const emailError =
    email.length > 0 && !isValidEmail(email) ? 'Enter a valid email' : '';
  const passwordError =
    password.length > 0 && password.length < 6
      ? 'At least 6 characters'
      : '';
  const clinicNameError =
    clinicName.length > 0 && clinicName.trim().length < 2
      ? 'Enter the clinic name'
      : '';
  const addressError =
    clinicAddress.length > 0 && clinicAddress.trim().length < 8
      ? 'Enter a full street address'
      : '';

  const canSubmit =
    name.trim().length > 0 &&
    isValidEmail(email) &&
    password.length >= 6 &&
    clinicName.trim().length >= 2 &&
    clinicAddress.trim().length >= 8 &&
    !register.isPending;

  function onSubmit() {
    if (!canSubmit) return;
    register.mutate(
      {
        name: name.trim(),
        email: email.trim(),
        password,
        clinicName: clinicName.trim(),
        clinicAddress: clinicAddress.trim(),
      },
      {
        onSuccess: () => {
          showSuccess('Clinic registered. You can use the dashboard now.');
          router.replace('/home');
        },
        onError: (err) => {
          showError(
            err instanceof Error
              ? err.message
              : 'Registration failed. Try again.',
          );
        },
      },
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Appbar.Header mode="center-aligned" style={styles.header}>
        {router.canGoBack() ? (
          <Appbar.BackAction onPress={() => router.back()} />
        ) : null}
        <Appbar.Content
          title="Register clinic"
          titleStyle={clinicScreen.headerTitle}
        />
      </Appbar.Header>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ClinicLogo compact />
          <Text variant="headlineSmall" style={styles.heading}>
            Join {APP_NAME}
          </Text>
          <Text variant="bodyMedium" style={styles.hint}>
            Register your clinic first, then you can sign in anytime.
          </Text>

          <Card style={clinicScreen.card} mode="elevated">
            <Card.Content>
          <Text variant="titleSmall" style={styles.sectionLabel}>
            Your details
          </Text>
          <TextInput
            label="Full name *"
            value={name}
            onChangeText={setName}
            mode="outlined"
            autoComplete="name"
            style={styles.input}
            disabled={register.isPending}
          />

          <TextInput
            label="Email *"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            style={styles.input}
            error={!!emailError}
            disabled={register.isPending}
          />
          <HelperText type="error" visible={!!emailError}>
            {emailError}
          </HelperText>

          <TextInput
            label="Password *"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={secure}
            autoComplete="new-password"
            style={styles.input}
            error={!!passwordError}
            disabled={register.isPending}
            right={
              <TextInput.Icon
                icon={secure ? 'eye-off' : 'eye'}
                disabled={register.isPending}
                onPress={() => {
                  if (!register.isPending) setSecure((s) => !s);
                }}
              />
            }
          />
          <HelperText type="error" visible={!!passwordError}>
            {passwordError}
          </HelperText>

          <Divider style={styles.divider} />

          <Text variant="titleSmall" style={styles.sectionLabel}>
            Clinic details
          </Text>
          <TextInput
            label="Clinic name *"
            value={clinicName}
            onChangeText={setClinicName}
            mode="outlined"
            style={styles.input}
            error={!!clinicNameError}
            disabled={register.isPending}
          />
          <HelperText type="error" visible={!!clinicNameError}>
            {clinicNameError}
          </HelperText>

          <TextInput
            label="Clinic address *"
            value={clinicAddress}
            onChangeText={setClinicAddress}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={[styles.input, styles.addressInput]}
            placeholder="Street, city, postal code"
            error={!!addressError}
            disabled={register.isPending}
          />
          <HelperText type="error" visible={!!addressError}>
            {addressError}
          </HelperText>

          <Button
            mode="contained"
            onPress={onSubmit}
            loading={register.isPending}
            disabled={!canSubmit}
            style={[clinicScreen.button, styles.button]}
            contentStyle={clinicScreen.buttonContent}>
            Register & go to dashboard
          </Button>
            </Card.Content>
          </Card>

          <View style={styles.footer}>
            <Text variant="bodyMedium" style={styles.footerText}>
              Already registered?{' '}
            </Text>
            <Link href="/login" asChild>
              <Pressable hitSlop={8} disabled={register.isPending}>
                <Text style={styles.link}>Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <LoadingOverlay
        visible={register.isPending}
        message="Creating your clinic account…"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    elevation: 0,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingTop: spacing.sm,
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
  sectionLabel: {
    ...typography.title,
    fontSize: 15,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: 0,
    backgroundColor: colors.surface,
  },
  addressInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  divider: {
    marginVertical: spacing.lg,
    backgroundColor: colors.border,
  },
  button: {
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
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
