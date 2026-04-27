import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Button,
  Checkbox,
  Divider,
  HelperText,
  Text,
  TextInput,
} from 'react-native-paper';

import { AuthBackLink, AuthScaffold } from '@/components/auth/AuthScaffold';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, spacing } from '@/constants';
import { colors } from '@/constants/Colors';
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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const register = useRegisterMutation();

  useEffect(() => {
    register.reset();
    setSubmitError(null);
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
    termsAccepted &&
    !register.isPending;

  function onSubmit() {
    if (!canSubmit) return;
    setSubmitError(null);
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
          router.replace('/home');
        },
        onError: (err) => {
          setSubmitError(
            err instanceof Error
              ? err.message
              : 'Registration failed. Try again.',
          );
        },
      },
    );
  }

  return (
    <>
      <AuthScaffold
        cardTitle="Sign up"
        cardSubtitle="Register your clinic to start using the dashboard."
        headerAccessory={
          router.canGoBack() ? (
            <AuthBackLink label="Back" onPress={() => router.back()} />
          ) : null
        }
        footer={
          <View style={styles.footerRow}>
            <Text style={styles.footerMuted}>Already have an account? </Text>
            <Link href="/login" asChild>
              <Pressable hitSlop={10} disabled={register.isPending}>
                <Text style={styles.footerLink}>Login</Text>
              </Pressable>
            </Link>
          </View>
        }>
        <TextInput
          mode="flat"
          label="Full name"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          style={styles.input}
          underlineColor={colors.border}
          activeUnderlineColor={colors.primary}
          left={<TextInput.Icon icon="account-outline" color={colors.textMuted} />}
          disabled={register.isPending}
        />

        <TextInput
          mode="flat"
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={styles.inputSpaced}
          underlineColor={colors.border}
          activeUnderlineColor={colors.primary}
          left={<TextInput.Icon icon="email-outline" color={colors.textMuted} />}
          error={!!emailError}
          disabled={register.isPending}
        />
        <HelperText type="error" visible={!!emailError}>
          {emailError}
        </HelperText>

        <TextInput
          mode="flat"
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secure}
          autoComplete="new-password"
          style={styles.inputSpaced}
          underlineColor={colors.border}
          activeUnderlineColor={colors.primary}
          left={<TextInput.Icon icon="lock-outline" color={colors.textMuted} />}
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
          Clinic
        </Text>

        <TextInput
          mode="flat"
          label="Clinic name"
          value={clinicName}
          onChangeText={setClinicName}
          style={styles.inputSpaced}
          underlineColor={colors.border}
          activeUnderlineColor={colors.primary}
          left={
            <TextInput.Icon icon="hospital-building" color={colors.textMuted} />
          }
          error={!!clinicNameError}
          disabled={register.isPending}
        />
        <HelperText type="error" visible={!!clinicNameError}>
          {clinicNameError}
        </HelperText>

        <TextInput
          mode="flat"
          label="Clinic address"
          value={clinicAddress}
          onChangeText={setClinicAddress}
          multiline
          numberOfLines={3}
          style={[styles.inputSpaced, styles.addressInput]}
          underlineColor={colors.border}
          activeUnderlineColor={colors.primary}
          left={<TextInput.Icon icon="map-marker-outline" color={colors.textMuted} />}
          placeholder="Street, city, postal code"
          error={!!addressError}
          disabled={register.isPending}
        />
        <HelperText type="error" visible={!!addressError}>
          {addressError}
        </HelperText>

        <View style={styles.termsRow}>
          <Checkbox.Android
            status={termsAccepted ? 'checked' : 'unchecked'}
            onPress={() => setTermsAccepted((v) => !v)}
            color={colors.primary}
            disabled={register.isPending}
          />
          <Pressable
            onPress={() => setTermsAccepted((v) => !v)}
            style={styles.termsPress}
            disabled={register.isPending}>
            <Text variant="bodyMedium" style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsBold}>Terms &amp; conditions</Text>
            </Text>
          </Pressable>
        </View>

        {submitError ? (
          <HelperText type="error" visible style={styles.submitError}>
            {submitError}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          onPress={onSubmit}
          loading={register.isPending}
          disabled={!canSubmit}
          buttonColor={colors.secondary}
          textColor={colors.onPrimary}
          style={[clinicScreen.button, styles.submitBtn]}
          contentStyle={clinicScreen.buttonContent}>
          Register
        </Button>
      </AuthScaffold>
      <LoadingOverlay
        visible={register.isPending}
        message="Creating your clinic account…"
      />
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
  },
  divider: {
    marginVertical: spacing.lg,
    backgroundColor: colors.border,
  },
  sectionLabel: {
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  addressInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  termsPress: {
    flex: 1,
    paddingTop: 2,
  },
  termsText: {
    color: colors.text,
    lineHeight: 22,
  },
  termsBold: {
    fontWeight: '800',
    color: colors.secondary,
    textDecorationLine: 'underline',
  },
  submitError: {
    marginBottom: spacing.sm,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerMuted: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 15,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 15,
  },
});
