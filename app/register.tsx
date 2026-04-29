import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  Checkbox,
  HelperText,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogoMark } from '@/components/ClinicLogo';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, SCREEN_EDGE, spacing } from '@/constants';
import { colors } from '@/constants/Colors';
import { useClinicApplicationMutation } from '@/hooks/useClinicApplicationMutation';
import {
  isValidApplicationPhone,
  isValidEmail,
  isValidPincode,
  normalizePhoneDigits,
} from '@/utils/validation';

const MAX_LICENSE_BYTES = 5 * 1024 * 1024;
const LICENSE_PICK_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export default function RegisterScreen() {
  const router = useRouter();

  const [clinicName, setClinicName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [licenseAsset, setLicenseAsset] =
    useState<DocumentPickerAsset | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const apply = useClinicApplicationMutation();

  useEffect(() => {
    apply.reset();
    setSubmitError(null);
  }, [
    clinicName,
    ownerName,
    phone,
    email,
    licenseNumber,
    address,
    city,
    state,
    pincode,
    licenseAsset,
  ]);

  const phoneDigits = useMemo(() => normalizePhoneDigits(phone), [phone]);

  const clinicNameError =
    clinicName.length > 0 && clinicName.trim().length < 2
      ? 'Enter the clinic name'
      : '';
  const ownerNameError =
    ownerName.length > 0 && ownerName.trim().length < 2
      ? 'Enter the owner or contact name'
      : '';
  const phoneError =
    phone.length > 0 && !isValidApplicationPhone(phoneDigits)
      ? 'Enter a valid phone number (10–15 digits)'
      : '';
  const emailError =
    email.length > 0 && !isValidEmail(email) ? 'Enter a valid email' : '';
  const licenseNoError =
    licenseNumber.length > 0 && licenseNumber.trim().length < 2
      ? 'Enter the license number'
      : '';
  const addressError =
    address.length > 0 && address.trim().length < 10
      ? 'Enter a complete street address'
      : '';
  const cityError =
    city.length > 0 && city.trim().length < 2 ? 'Enter city' : '';
  const stateError =
    state.length > 0 && state.trim().length < 2 ? 'Enter state' : '';
  const pincodeError =
    pincode.length > 0 && !isValidPincode(pincode)
      ? 'Enter a 6-digit PIN code'
      : '';

  const formValid =
    clinicName.trim().length >= 2 &&
    ownerName.trim().length >= 2 &&
    isValidApplicationPhone(phoneDigits) &&
    (email.trim().length === 0 || isValidEmail(email)) &&
    licenseNumber.trim().length >= 2 &&
    address.trim().length >= 10 &&
    city.trim().length >= 2 &&
    state.trim().length >= 2 &&
    isValidPincode(pincode) &&
    termsAccepted;

  const canSubmit = formValid && !apply.isPending;

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/login');
    }
  }

  async function pickLicense() {
    setSubmitError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [...LICENSE_PICK_TYPES],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) {
        return;
      }
      const asset = result.assets[0];
      const size = asset.size ?? 0;
      if (size > MAX_LICENSE_BYTES) {
        setSubmitError('File must be 5 MB or smaller (PDF, JPG, or PNG).');
        return;
      }
      setLicenseAsset(asset);
    } catch {
      setSubmitError('Could not open the file picker. Try again.');
    }
  }

  function clearLicense() {
    setLicenseAsset(null);
  }

  function onSubmit() {
    if (!canSubmit) return;
    setSubmitError(null);

    const fields = {
      clinic_name: clinicName.trim(),
      owner_name: ownerName.trim(),
      phone: phoneDigits,
      email: email.trim() || undefined,
      license_number: licenseNumber.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
    };

    apply.mutate(
      { fields, licenseAsset },
      {
        onSuccess: (data) => {
          Alert.alert(
            'Application submitted',
            `We will review your application and contact you within 2–3 business days.\n\n${data.clinic_name} · Reference #${data.id}`,
            [{ text: 'OK', onPress: () => router.replace('/login') }],
          );
        },
        onError: (err) => {
          setSubmitError(
            err instanceof Error
              ? err.message
              : 'Could not submit your application. Try again.',
          );
        },
      },
    );
  }

  const inputOutline = {
    outlineColor: colors.border,
    activeOutlineColor: colors.primary,
  } as const;

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            <View style={[styles.header, { paddingHorizontal: SCREEN_EDGE }]}>
              <Pressable
                onPress={goBack}
                hitSlop={12}
                style={styles.backBtn}
                accessibilityRole="button"
                accessibilityLabel="Go back">
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={26}
                  color={colors.primary}
                />
              </Pressable>
              <View style={styles.headerBrand}>
                <BrandLogoMark size={44} padded />
                <View style={styles.headerTitles}>
                  <Text variant="headlineSmall" style={styles.title}>
                    Registration
                  </Text>
                  <Text variant="bodyMedium" style={styles.subtitle}>
                    Clinic application
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.card,
                { marginHorizontal: SCREEN_EDGE, padding: SCREEN_EDGE },
              ]}>
              <Text variant="bodyMedium" style={styles.lead}>
                Complete the form below. We usually respond within 2–3 business
                days.
              </Text>

              <TextInput
                mode="outlined"
                dense
                label="Clinic name *"
                value={clinicName}
                onChangeText={setClinicName}
                style={styles.input}
                {...inputOutline}
                left={
                  <TextInput.Icon
                    icon="hospital-building"
                    color={colors.textMuted}
                  />
                }
                error={!!clinicNameError}
                disabled={apply.isPending}
              />
              <HelperText type="error" visible={!!clinicNameError}>
                {clinicNameError}
              </HelperText>

              <TextInput
                mode="outlined"
                dense
                label="Owner / contact name *"
                value={ownerName}
                onChangeText={setOwnerName}
                style={styles.inputSpaced}
                {...inputOutline}
                left={
                  <TextInput.Icon icon="account-outline" color={colors.textMuted} />
                }
                error={!!ownerNameError}
                disabled={apply.isPending}
              />
              <HelperText type="error" visible={!!ownerNameError}>
                {ownerNameError}
              </HelperText>

              <TextInput
                mode="outlined"
                dense
                label="Phone *"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                style={styles.inputSpaced}
                {...inputOutline}
                left={
                  <TextInput.Icon icon="phone-outline" color={colors.textMuted} />
                }
                placeholder="10-digit mobile"
                error={!!phoneError}
                disabled={apply.isPending}
              />
              <HelperText type="error" visible={!!phoneError}>
                {phoneError}
              </HelperText>

              <TextInput
                mode="outlined"
                dense
                label="Email (optional)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={styles.inputSpaced}
                {...inputOutline}
                left={
                  <TextInput.Icon icon="email-outline" color={colors.textMuted} />
                }
                error={!!emailError}
                disabled={apply.isPending}
              />
              <HelperText type="error" visible={!!emailError}>
                {emailError}
              </HelperText>

              <TextInput
                mode="outlined"
                dense
                label="License number *"
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                style={styles.inputSpaced}
                {...inputOutline}
                left={
                  <TextInput.Icon
                    icon="certificate-outline"
                    color={colors.textMuted}
                  />
                }
                error={!!licenseNoError}
                disabled={apply.isPending}
              />
              <HelperText type="error" visible={!!licenseNoError}>
                {licenseNoError}
              </HelperText>

              <TextInput
                mode="outlined"
                dense
                label="Address *"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
                style={[styles.inputSpaced, styles.addressInput]}
                {...inputOutline}
                left={
                  <TextInput.Icon
                    icon="map-marker-outline"
                    color={colors.textMuted}
                  />
                }
                placeholder="Street, area, landmark"
                error={!!addressError}
                disabled={apply.isPending}
              />
              <HelperText type="error" visible={!!addressError}>
                {addressError}
              </HelperText>

              <TextInput
                mode="outlined"
                dense
                label="City *"
                value={city}
                onChangeText={setCity}
                style={styles.inputSpaced}
                {...inputOutline}
                left={
                  <TextInput.Icon
                    icon="city-variant-outline"
                    color={colors.textMuted}
                  />
                }
                error={!!cityError}
                disabled={apply.isPending}
              />
              <HelperText type="error" visible={!!cityError}>
                {cityError}
              </HelperText>

              <TextInput
                mode="outlined"
                dense
                label="State *"
                value={state}
                onChangeText={setState}
                style={styles.inputSpaced}
                {...inputOutline}
                left={<TextInput.Icon icon="map-outline" color={colors.textMuted} />}
                error={!!stateError}
                disabled={apply.isPending}
              />
              <HelperText type="error" visible={!!stateError}>
                {stateError}
              </HelperText>

              <TextInput
                mode="outlined"
                dense
                label="PIN code *"
                value={pincode}
                onChangeText={setPincode}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.inputSpaced}
                {...inputOutline}
                left={<TextInput.Icon icon="numeric" color={colors.textMuted} />}
                error={!!pincodeError}
                disabled={apply.isPending}
              />
              <HelperText type="error" visible={!!pincodeError}>
                {pincodeError}
              </HelperText>

              <Text variant="titleSmall" style={styles.docSectionLabel}>
                License document (optional)
              </Text>
              <Text variant="bodySmall" style={styles.docHint}>
                PDF, JPG, or PNG — max 5 MB. Uploaded before your application is
                sent.
              </Text>
              <View style={styles.docRow}>
                <Button
                  mode="outlined"
                  onPress={pickLicense}
                  disabled={apply.isPending}
                  style={styles.docPickBtn}
                  textColor={colors.primary}>
                  {licenseAsset ? 'Change file' : 'Attach file'}
                </Button>
                {licenseAsset ? (
                  <Button
                    mode="text"
                    onPress={clearLicense}
                    disabled={apply.isPending}
                    textColor={colors.textMuted}>
                    Remove
                  </Button>
                ) : null}
              </View>
              {licenseAsset ? (
                <Text variant="bodySmall" style={styles.fileName} numberOfLines={2}>
                  {licenseAsset.name}
                </Text>
              ) : null}

              <View style={styles.termsRow}>
                <Checkbox.Android
                  status={termsAccepted ? 'checked' : 'unchecked'}
                  onPress={() => setTermsAccepted((v) => !v)}
                  color={colors.primary}
                  disabled={apply.isPending}
                />
                <Pressable
                  onPress={() => setTermsAccepted((v) => !v)}
                  style={styles.termsPress}
                  disabled={apply.isPending}>
                  <Text variant="bodyMedium" style={styles.termsText}>
                    I confirm the information is accurate and I agree to the{' '}
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
                loading={apply.isPending}
                disabled={!canSubmit}
                buttonColor={colors.secondary}
                textColor={colors.onPrimary}
                style={[clinicScreen.button, styles.submitBtn]}
                contentStyle={clinicScreen.buttonContent}>
                Submit application
              </Button>

              <View style={styles.footerLogin}>
                <Text variant="bodyMedium" style={styles.footerMuted}>
                  Already have an account?{' '}
                </Text>
                <Link href="/login" asChild>
                  <Pressable hitSlop={10} disabled={apply.isPending}>
                    <Text style={styles.footerLink}>Login</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <LoadingOverlay
        visible={apply.isPending}
        message={
          licenseAsset
            ? 'Uploading document and submitting…'
            : 'Submitting application…'
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  backBtn: {
    marginRight: spacing.xs,
  },
  headerBrand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitles: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontWeight: '800',
    color: colors.secondary,
    letterSpacing: 0.2,
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: 2,
  },
  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lead: {
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  input: {
    backgroundColor: colors.surface,
  },
  inputSpaced: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
  },
  addressInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  docSectionLabel: {
    fontWeight: '700',
    color: colors.secondary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  docHint: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  docPickBtn: {
    alignSelf: 'flex-start',
  },
  fileName: {
    color: colors.textMuted,
    marginTop: spacing.xs,
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
  footerLogin: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  footerMuted: {
    color: colors.textMuted,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 15,
  },
});
