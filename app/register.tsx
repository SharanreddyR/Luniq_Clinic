import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { Link, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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

import {
  AuthBackLink,
  AuthScaffold,
  AuthSectionTitle,
  authInputOutline,
} from '@/components/auth/AuthScaffold';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, radii, spacing } from '@/constants';
import { colors } from '@/constants/Colors';
import { useClinicApplicationMutation } from '@/hooks/useClinicApplicationMutation';
import {
  isValidClinicRegistrationPhone,
  isValidEmail,
  isValidPincode,
  normalizeClinicRegistrationPhone,
} from '@/utils/validation';

const MAX_LICENSE_BYTES = 5 * 1024 * 1024;
const LICENSE_PICK_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export default function RegisterScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

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

  const phoneDigits = useMemo(
    () => normalizeClinicRegistrationPhone(phone),
    [phone],
  );

  const clinicNameError =
    clinicName.length > 0 && clinicName.trim().length < 2
      ? 'Enter the clinic name'
      : '';
  const ownerNameError =
    ownerName.length > 0 && ownerName.trim().length < 2
      ? 'Enter the owner or contact name'
      : '';
  const phoneError =
    phone.length > 0 && !isValidClinicRegistrationPhone(phoneDigits)
      ? 'Enter exactly 10 digits (mobile number)'
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
    isValidClinicRegistrationPhone(phoneDigits) &&
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

  return (
    <>
      <AuthScaffold
        ref={scrollRef}
        cardKicker="Partner onboarding"
        cardTitle="Register your clinic"
        cardSubtitle="Tell us about your clinic. Our team will verify your details and enable your partner account."
        headerAccessory={
          <AuthBackLink label="Back to sign in" onPress={goBack} />
        }
        footer={
          <View style={styles.footerLogin}>
            <Text variant="bodyMedium" style={styles.footerMuted}>
              Already have an account?{' '}
            </Text>
            <Link href="/login" asChild>
              <Pressable hitSlop={10} disabled={apply.isPending}>
                <Text style={styles.footerLink}>Sign in</Text>
              </Pressable>
            </Link>
          </View>
        }>
        <AuthSectionTitle title="Clinic details" icon="hospital-building" />

        <TextInput
          mode="outlined"
          label="Clinic name *"
          value={clinicName}
          onChangeText={setClinicName}
          style={styles.input}
          {...authInputOutline}
          left={
            <TextInput.Icon icon="hospital-building" color={colors.textMuted} />
          }
          error={!!clinicNameError}
          disabled={apply.isPending}
        />
        <HelperText type="error" visible={!!clinicNameError}>
          {clinicNameError}
        </HelperText>

        <TextInput
          mode="outlined"
          label="Owner / contact name *"
          value={ownerName}
          onChangeText={setOwnerName}
          style={styles.inputSpaced}
          {...authInputOutline}
          left={<TextInput.Icon icon="account-outline" color={colors.textMuted} />}
          error={!!ownerNameError}
          disabled={apply.isPending}
        />
        <HelperText type="error" visible={!!ownerNameError}>
          {ownerNameError}
        </HelperText>

        <TextInput
          mode="outlined"
          label="Phone *"
          value={phone}
          onChangeText={(t) =>
            setPhone(normalizeClinicRegistrationPhone(t))
          }
          keyboardType="phone-pad"
          autoComplete="tel"
          style={styles.inputSpaced}
          {...authInputOutline}
          left={<TextInput.Icon icon="phone-outline" color={colors.textMuted} />}
          placeholder="10-digit mobile"
          error={!!phoneError}
          disabled={apply.isPending}
        />
        <HelperText type="error" visible={!!phoneError}>
          {phoneError}
        </HelperText>

        <TextInput
          mode="outlined"
          label="Email (optional)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={styles.inputSpaced}
          {...authInputOutline}
          left={<TextInput.Icon icon="email-outline" color={colors.textMuted} />}
          error={!!emailError}
          disabled={apply.isPending}
        />
        <HelperText type="error" visible={!!emailError}>
          {emailError}
        </HelperText>

        <TextInput
          mode="outlined"
          label="License number *"
          value={licenseNumber}
          onChangeText={setLicenseNumber}
          style={styles.inputSpaced}
          {...authInputOutline}
          left={
            <TextInput.Icon icon="certificate-outline" color={colors.textMuted} />
          }
          error={!!licenseNoError}
          disabled={apply.isPending}
        />
        <HelperText type="error" visible={!!licenseNoError}>
          {licenseNoError}
        </HelperText>

        <AuthSectionTitle title="Location" icon="map-marker-outline" />

        <TextInput
          mode="outlined"
          label="Address *"
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={3}
          style={[styles.inputSpaced, styles.addressInput]}
          {...authInputOutline}
          left={
            <TextInput.Icon icon="map-marker-outline" color={colors.textMuted} />
          }
          placeholder="Street, area, landmark"
          error={!!addressError}
          disabled={apply.isPending}
        />
        <HelperText type="error" visible={!!addressError}>
          {addressError}
        </HelperText>

        <View style={styles.rowInputs}>
          <View style={styles.rowHalf}>
            <TextInput
              mode="outlined"
              label="City *"
              value={city}
              onChangeText={setCity}
              style={styles.input}
              {...authInputOutline}
              error={!!cityError}
              disabled={apply.isPending}
            />
            <HelperText type="error" visible={!!cityError}>
              {cityError}
            </HelperText>
          </View>
          <View style={styles.rowHalf}>
            <TextInput
              mode="outlined"
              label="State *"
              value={state}
              onChangeText={setState}
              style={styles.input}
              {...authInputOutline}
              error={!!stateError}
              disabled={apply.isPending}
            />
            <HelperText type="error" visible={!!stateError}>
              {stateError}
            </HelperText>
          </View>
        </View>

        <TextInput
          mode="outlined"
          label="PIN code *"
          value={pincode}
          onChangeText={setPincode}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.inputSpaced}
          {...authInputOutline}
          left={<TextInput.Icon icon="numeric" color={colors.textMuted} />}
          error={!!pincodeError}
          disabled={apply.isPending}
        />
        <HelperText type="error" visible={!!pincodeError}>
          {pincodeError}
        </HelperText>

        <AuthSectionTitle title="Documents" icon="file-document-outline" />

        <View style={styles.docCard}>
          <Text variant="bodySmall" style={styles.docHint}>
            Attach your clinic license (optional). PDF, JPG, or PNG — max 5 MB.
          </Text>
          <View style={styles.docRow}>
            <Button
              mode="contained-tonal"
              icon="paperclip"
              onPress={pickLicense}
              disabled={apply.isPending}
              buttonColor={colors.surfaceVariant}
              textColor={colors.secondary}
              style={styles.docPickBtn}>
              {licenseAsset ? 'Change file' : 'Attach license'}
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
        </View>

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
          contentStyle={styles.submitBtnContent}
          labelStyle={styles.submitBtnLabel}>
          Submit application
        </Button>
      </AuthScaffold>
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
  input: {
    backgroundColor: colors.surface,
  },
  inputSpaced: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
  },
  addressInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  rowHalf: {
    flex: 1,
  },
  docCard: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  docHint: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  docPickBtn: {
    alignSelf: 'flex-start',
    borderRadius: radii.button,
  },
  fileName: {
    color: colors.secondary,
    marginTop: spacing.sm,
    fontWeight: '600',
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
    borderRadius: radii.button,
  },
  submitBtnContent: {
    minHeight: 52,
  },
  submitBtnLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  footerLogin: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerMuted: {
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '500',
  },
  footerLink: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 15,
  },
});
