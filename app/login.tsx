import { Link } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClinicLogo } from '@/components/ClinicLogo';
import { colors } from '@/constants/Colors';
import { useLoginMutation } from '@/hooks/useLoginMutation';
import { isValidEmail } from '@/utils/validation';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);

  const login = useLoginMutation();

  const emailError =
    email.length > 0 && !isValidEmail(email) ? 'Enter a valid email' : '';
  const canSubmit =
    isValidEmail(email) && password.length >= 1 && !login.isPending;

  function onSubmit() {
    if (!canSubmit) return;
    login.mutate({ email: email.trim(), password });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ClinicLogo compact />
          <Text variant="headlineSmall" style={styles.heading}>
            Clinic login
          </Text>
          <Text variant="bodyMedium" style={styles.hint}>
            Sign in with your clinic portal credentials
          </Text>

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
            autoComplete="password"
            style={styles.input}
            right={
              <TextInput.Icon
                icon={secure ? 'eye-off' : 'eye'}
                onPress={() => setSecure((s) => !s)}
              />
            }
          />

          {login.isError && (
            <HelperText type="error" visible>
              {login.error instanceof Error
                ? login.error.message
                : 'Something went wrong'}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={onSubmit}
            loading={login.isPending}
            disabled={!canSubmit}
            style={styles.button}
            contentStyle={styles.buttonContent}>
            Sign in
          </Button>

          <View style={styles.footer}>
            <Text variant="bodyMedium" style={styles.footerText}>
              New here?{' '}
            </Text>
            <Link href="/register" asChild>
              <Pressable hitSlop={8}>
                <Text style={styles.link}>Create an account</Text>
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
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  heading: {
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: 4,
  },
  hint: {
    color: colors.textMuted,
    marginBottom: 24,
  },
  input: {
    marginBottom: 0,
    backgroundColor: colors.surface,
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
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
