import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Appbar, Button, HelperText, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClinicLogo } from '@/components/ClinicLogo';
import { colors } from '@/constants/Colors';
import { APP_NAME } from '@/constants/config';
import { useRegisterMutation } from '@/hooks/useRegisterMutation';
import { isValidEmail } from '@/utils/validation';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);

  const register = useRegisterMutation();

  const emailError =
    email.length > 0 && !isValidEmail(email) ? 'Enter a valid email' : '';
  const passwordError =
    password.length > 0 && password.length < 6
      ? 'At least 6 characters'
      : '';
  const canSubmit =
    name.trim().length > 0 &&
    isValidEmail(email) &&
    password.length >= 6 &&
    !register.isPending;

  function onSubmit() {
    if (!canSubmit) return;
    register.mutate({
      name: name.trim(),
      email: email.trim(),
      password,
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Appbar.Header mode="center-aligned" style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Register" titleStyle={styles.headerTitle} />
      </Appbar.Header>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ClinicLogo compact />
          <Text variant="headlineSmall" style={styles.heading}>
            Join {APP_NAME}
          </Text>
          <Text variant="bodyMedium" style={styles.hint}>
            Create an account to book visits and see your care team
          </Text>

          <TextInput
            label="Full name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            autoComplete="name"
            style={styles.input}
          />

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            style={styles.input}
            error={!!emailError}
          />
          <HelperText type="error" visible={!!emailError}>
            {emailError}
          </HelperText>

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={secure}
            autoComplete="new-password"
            style={styles.input}
            error={!!passwordError}
            right={
              <TextInput.Icon
                icon={secure ? 'eye-off' : 'eye'}
                onPress={() => setSecure((s) => !s)}
              />
            }
          />
          <HelperText type="error" visible={!!passwordError}>
            {passwordError}
          </HelperText>

          {register.isError && (
            <HelperText type="error" visible>
              {register.error instanceof Error
                ? register.error.message
                : 'Something went wrong'}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={onSubmit}
            loading={register.isPending}
            disabled={!canSubmit}
            style={styles.button}
            contentStyle={styles.buttonContent}>
            Create account
          </Button>

          <View style={styles.footer}>
            <Text variant="bodyMedium" style={styles.footerText}>
              Already have an account?{' '}
            </Text>
            <Link href="/login" asChild>
              <Pressable hitSlop={8}>
                <Text style={styles.link}>Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerTitle: {
    color: colors.secondary,
    fontWeight: '600',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },
  heading: {
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: 4,
  },
  hint: {
    color: colors.textMuted,
    marginBottom: 20,
  },
  input: {
    marginBottom: 0,
    backgroundColor: colors.surface,
  },
  button: {
    marginTop: 12,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    flexWrap: 'wrap',
  },
  footerText: {
    color: colors.textMuted,
  },
  link: {
    color: colors.primary,
    fontWeight: '600',
  },
});
