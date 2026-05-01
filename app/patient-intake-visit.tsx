import type { DocumentPickerAsset } from 'expo-document-picker';
import { Redirect, router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
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
  Chip,
  HelperText,
  IconButton,
  List,
  Menu,
  RadioButton,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClaimCameraModal } from '@/components/ClaimCameraModal';
import { CompactScreenHeader } from '@/components/ui/CompactScreenHeader';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, radii, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { INTAKE_UPLOAD_ROWS } from '@/constants/intakeUploads';
import { DEFAULT_VISIT_SERVICES } from '@/constants/visitServices';
import { useAppToast } from '@/hooks/useAppToast';
import { useDoctors } from '@/hooks/useDoctors';
import { useUploadDocument } from '@/hooks/useUploadDocument';
import { composeAdminVisitApprovalEmail } from '@/services/mailAdminVisitApproval';
import { pickDocument, type UploadCategory } from '@/services/uploadService';
import type { Doctor } from '@/services/doctorService';
import { printVisitSummaryPdf } from '@/services/visitSummaryPdf';
import {
  useAuthStore,
  useClaimDraftStore,
  usePatientStore,
  useVisitHistoryStore,
} from '@/store';

function isImageLikeAsset(asset: DocumentPickerAsset | null): boolean {
  if (!asset?.uri) return false;
  const mime = asset.mimeType?.toLowerCase() ?? '';
  if (mime.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|heic|heif)(\?|$)/i.test(asset.uri);
}

function IntakeAttachmentRow({
  label,
  icon,
  assets,
  onPickDocument,
  onPickPhoto,
  onRemoveAt,
  onClearAll,
  disabled,
  showCamera,
  busy,
}: {
  label: string;
  icon: string;
  assets: DocumentPickerAsset[];
  onPickDocument: () => void;
  onPickPhoto: () => void;
  onRemoveAt: (index: number) => void;
  onClearAll: () => void;
  disabled: boolean;
  showCamera: boolean;
  busy: boolean;
}) {
  const [previewIndex, setPreviewIndex] = useState(0);

  const count = assets.length;
  const summary =
    count === 0
      ? 'No files yet — add one or more photos or documents.'
      : `${count} file${count === 1 ? '' : 's'} attached`;

  const prevCountRef = useRef(0);
  useEffect(() => {
    if (count === 0) {
      setPreviewIndex(0);
      prevCountRef.current = 0;
      return;
    }
    if (count > prevCountRef.current) {
      setPreviewIndex(count - 1);
    } else {
      setPreviewIndex((prev) => Math.min(Math.max(0, prev), count - 1));
    }
    prevCountRef.current = count;
  }, [count]);

  const previewAsset =
    count > 0 ? assets[Math.min(previewIndex, count - 1)] : null;

  return (
    <View style={styles.attachRow}>
      <View style={styles.attachHead}>
        <List.Icon color={colors.primary} icon={icon} />
        <Text variant="titleSmall" style={styles.attachLabel}>
          {label}
        </Text>
      </View>
      <Text variant="bodySmall" style={styles.attachFile} numberOfLines={2}>
        {summary}
      </Text>
      {count > 0 ? (
        <>
          <ScrollView
            horizontal
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator
            style={styles.attachThumbStrip}
            contentContainerStyle={styles.attachThumbScroll}>
            {assets.map((asset, index) => (
              <View
                key={`${asset.uri}-${index}`}
                style={[
                  styles.attachThumbWrap,
                  index === previewIndex && styles.attachThumbWrapSelected,
                ]}
                accessibilityLabel={`${label} ${index + 1}`}>
                <Pressable
                  onPress={() => setPreviewIndex(index)}
                  style={({ pressed }) => [
                    styles.attachThumbHit,
                    pressed && styles.attachThumbWrapPressed,
                  ]}
                  accessibilityLabel={`Show preview for file ${index + 1}`}>
                  {isImageLikeAsset(asset) ? (
                    <Image
                      source={{ uri: asset.uri }}
                      style={styles.attachThumbImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.attachThumbImage, styles.attachThumbDoc]}>
                      <Text variant="labelSmall" numberOfLines={3} style={styles.attachThumbDocText}>
                        {asset.name ?? 'Document'}
                      </Text>
                    </View>
                  )}
                </Pressable>
                <IconButton
                  icon="close-circle"
                  size={22}
                  iconColor={colors.error}
                  style={styles.attachThumbRemove}
                  onPress={() => onRemoveAt(index)}
                  accessibilityLabel="Remove this file"
                />
              </View>
            ))}
          </ScrollView>
          {previewAsset ? (
            <View style={styles.attachLargePreviewWrap}>
              <Text variant="labelSmall" style={styles.attachLargePreviewLabel}>
                Preview (tap a thumbnail above to switch)
              </Text>
              {isImageLikeAsset(previewAsset) ? (
                <Image
                  source={{ uri: previewAsset.uri }}
                  style={styles.attachLargePreview}
                  resizeMode="contain"
                  accessibilityLabel={`Large preview of ${label}`}
                />
              ) : (
                <View style={[styles.attachLargePreview, styles.attachLargeDoc]}>
                  <Text variant="bodyMedium" style={styles.attachLargeDocText}>
                    {previewAsset.name ?? 'Document'}
                  </Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    Non-image file — open from device to view full content.
                  </Text>
                </View>
              )}
            </View>
          ) : null}
        </>
      ) : null}
      <View style={styles.attachActions}>
        <Button
          mode="outlined"
          icon="folder-open"
          onPress={onPickDocument}
          disabled={disabled || busy}
          style={styles.attachBtn}
          contentStyle={clinicScreen.buttonContentCompact}>
          Choose file
        </Button>
        {showCamera ? (
          <Button
            mode="outlined"
            icon="camera"
            onPress={onPickPhoto}
            disabled={disabled || busy}
            style={styles.attachBtn}
            contentStyle={clinicScreen.buttonContentCompact}>
            Take photo
          </Button>
        ) : null}
        {count > 0 ? (
          <Button
            mode="text"
            onPress={onClearAll}
            disabled={disabled || busy}
            style={styles.attachBtn}
            contentStyle={clinicScreen.buttonContentCompact}>
            Clear all
          </Button>
        ) : null}
      </View>
    </View>
  );
}

export default function PatientIntakeVisitScreen() {
  const activePatient = usePatientStore((s) => s.activePatient);
  const setVisitSession = usePatientStore((s) => s.setVisitSession);
  const setDraft = useClaimDraftStore((s) => s.setDraft);
  const clinic = useAuthStore((s) => s.clinic);
  const { showSuccess } = useAppToast();

  const doctorsQuery = useDoctors();
  const upload = useUploadDocument();

  const [department, setDepartment] = useState<string | null>(null);
  const [deptMenuOpen, setDeptMenuOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceAmounts, setServiceAmounts] = useState<Record<string, string>>({});
  const [symptoms, setSymptoms] = useState('');

  const [assets, setAssets] = useState<
    Record<UploadCategory, DocumentPickerAsset[]>
  >({
    prescription: [],
    report: [],
    bill: [],
  });

  const [cameraCategory, setCameraCategory] = useState<UploadCategory | null>(
    null,
  );
  const captureCategoryRef = useRef<UploadCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const inputFocusProps = {
    outlineColor: colors.border,
    activeOutlineColor: colors.primary,
    selectionColor: colors.primary,
  } as const;

  useEffect(() => {
    captureCategoryRef.current = cameraCategory;
  }, [cameraCategory]);

  const allDoctors = doctorsQuery.data ?? [];
  const departments = useMemo(() => {
    const d = new Set(
      allDoctors.map((x) => x.department).filter((s) => s.trim().length > 0),
    );
    return [...d].sort((a, b) => a.localeCompare(b));
  }, [allDoctors]);

  const doctorsInDept = useMemo(() => {
    if (!department) return [];
    return allDoctors.filter((doc) => doc.department === department);
  }, [allDoctors, department]);

  useEffect(() => {
    if (!department && departments.length > 0) {
      setDepartment(departments[0]);
    }
  }, [department, departments]);

  useEffect(() => {
    if (!department) return;
    if (
      selectedDoctor &&
      doctorsInDept.some((d) => d.id === selectedDoctor.id)
    ) {
      return;
    }
    const firstAvail =
      doctorsInDept.find((d) => d.available) ?? doctorsInDept[0] ?? null;
    setSelectedDoctor(firstAvail);
  }, [department, doctorsInDept, selectedDoctor]);

  const appendAsset = useCallback(
    (category: UploadCategory, asset: DocumentPickerAsset) => {
      setAssets((prev) => ({
        ...prev,
        [category]: [...prev[category], asset],
      }));
      upload.mutate({ category, asset });
    },
    [upload],
  );

  const removeAssetAt = useCallback(
    (category: UploadCategory, index: number) => {
      setAssets((prev) => ({
        ...prev,
        [category]: prev[category].filter((_, i) => i !== index),
      }));
    },
    [],
  );

  const onCameraCaptured = useCallback(
    (asset: DocumentPickerAsset) => {
      const cat = captureCategoryRef.current;
      if (!cat) return;
      appendAsset(cat, asset);
    },
    [appendAsset],
  );

  async function onPickDocument(category: UploadCategory) {
    const a = await pickDocument();
    if (a) appendAsset(category, a);
  }

  function toggleService(name: string) {
    setSelectedServices((prev) => {
      const exists = prev.includes(name);
      const next = exists ? prev.filter((s) => s !== name) : [...prev, name];
      if (exists) {
        setServiceAmounts((curr) => {
          const copy = { ...curr };
          delete copy[name];
          return copy;
        });
      }
      return next;
    });
  }

  function setAmountForService(name: string, raw: string) {
    const cleaned = raw.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    const normalized =
      parts.length <= 1 ? cleaned : `${parts[0]}.${parts.slice(1).join('')}`;
    setServiceAmounts((prev) => ({ ...prev, [name]: normalized }));
  }

  const showCamera = Platform.OS !== 'web';

  const totalAmount = useMemo(() => {
    return selectedServices.reduce((sum, service) => {
      const n = Number(serviceAmounts[service] ?? '0');
      return Number.isFinite(n) ? sum + n : sum;
    }, 0);
  }, [selectedServices, serviceAmounts]);

  const canComplete =
    !!activePatient &&
    !!selectedDoctor &&
    selectedServices.length > 0 &&
    !saving;

  async function onCompleteVisit() {
    if (!activePatient || !selectedDoctor) return;
    setSaving(true);
    try {
      const slipId = `VIS-${Date.now().toString(36).toUpperCase()}`;
      const clinicName = clinic?.name?.trim() || 'Clinic';
      const amountStr = totalAmount.toFixed(2);
      const services = [...selectedServices];
      const symptomsStr = symptoms.trim();

      setVisitSession({
        doctor: {
          id: selectedDoctor.id,
          name: selectedDoctor.name,
          profession: selectedDoctor.department,
        },
        services,
        amount: amountStr,
      });

      const serviceAmountsSnapshot: Record<string, string> = {};
      for (const s of services) {
        const v = serviceAmounts[s];
        if (v != null && v !== '') serviceAmountsSnapshot[s] = v;
      }

      const attachments = INTAKE_UPLOAD_ROWS.map(({ category }) => ({
        category,
        files: assets[category].map((a) => ({
          name: a.name ?? 'Attachment',
          mimeType: a.mimeType ?? null,
        })),
      }));

      useVisitHistoryStore.getState().addVisit({
        id: slipId,
        patientId: activePatient.id,
        patientName: activePatient.name,
        patientCardNumber: activePatient.cardNumber,
        completedAt: new Date().toISOString(),
        slipId,
        doctorName: selectedDoctor.name,
        department: selectedDoctor.department,
        services,
        serviceAmounts: serviceAmountsSnapshot,
        totalAmount: amountStr,
        symptoms: symptomsStr,
        attachments,
      });

      let pdfUri: string | null = null;
      try {
        const { uri } = await printVisitSummaryPdf({
          slipId,
          clinicName,
          patientName: activePatient.name,
          patientCard: activePatient.cardNumber,
          department: selectedDoctor.department,
          doctorName: selectedDoctor.name,
          services,
          amount: amountStr,
          symptoms: symptomsStr || '—',
          generatedAtLabel: new Date().toLocaleString(),
        });
        pdfUri = uri;
      } catch {
        /* PDF optional — claim still opens */
      }

      setDraft({
        opdRef: slipId,
        pdfUri,
        patientId: activePatient.id,
        patientName: activePatient.name,
        patientCardNumber: activePatient.cardNumber,
        department: selectedDoctor.department,
        doctorName: selectedDoctor.name,
        services,
        amount: amountStr,
        symptoms: symptomsStr,
      });

      await composeAdminVisitApprovalEmail({
        slipId,
        patientName: activePatient.name,
        pdfUri,
      });

      router.push('/claim' as Href);
      requestAnimationFrame(() => {
        showSuccess('Visit saved successfully.');
      });
    } finally {
      setSaving(false);
    }
  }

  if (!activePatient) {
    return <Redirect href="/patient-intake" />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <CompactScreenHeader
        title="Visit"
        onBackPress={() => router.replace('/patient-intake' as Href)}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text variant="labelLarge" style={styles.heroKicker}>
              Step 2 · Visit &amp; billing
            </Text>
            <Text variant="headlineSmall" style={styles.heroTitle}>
              Record this visit
            </Text>
            <Text variant="bodyMedium" style={styles.intro}>
              Choose doctor and services, enter the bill amount, add files if
              needed, then continue to claim.
            </Text>
          </View>

          <Card style={[clinicScreen.card, styles.card, styles.patientCard]} mode="elevated">
            <Card.Content style={styles.patientRow}>
              <Image
                source={{ uri: activePatient.photo }}
                style={styles.patientPhoto}
              />
              <View style={styles.patientText}>
                <Text variant="titleSmall">{activePatient.name}</Text>
                <Text variant="bodySmall" style={styles.muted}>
                  {activePatient.cardNumber}
                  {activePatient.mobile ? ` · ${activePatient.mobile}` : ''}
                </Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={[clinicScreen.card, styles.card, styles.sectionCard]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Doctor &amp; department
              </Text>
              {doctorsQuery.isPending && !doctorsQuery.data ? (
                <Text variant="bodySmall">Loading doctors…</Text>
              ) : doctorsQuery.isError ? (
                <Text variant="bodySmall" style={styles.errorText}>
                  Could not load doctors. Pull to retry from roster, or continue
                  with cached data if shown.
                </Text>
              ) : null}

              <Text variant="labelLarge" style={styles.fieldLabel}>
                Department
              </Text>
              <Menu
                visible={deptMenuOpen}
                onDismiss={() => setDeptMenuOpen(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setDeptMenuOpen(true)}
                    disabled={saving || departments.length === 0}
                    style={[styles.menuBtn, styles.menuBtnRaised]}
                    contentStyle={styles.menuBtnContent}>
                    {department ?? 'Choose department'}
                  </Button>
                }>
                {departments.map((d) => (
                  <Menu.Item
                    key={d}
                    title={d}
                    onPress={() => {
                      setDepartment(d);
                      setDeptMenuOpen(false);
                    }}
                  />
                ))}
              </Menu>

              <Text variant="labelLarge" style={[styles.fieldLabel, styles.mt]}>
                Doctor
              </Text>
              {!department ? (
                <HelperText type="info" visible>
                  Select a department to see doctors.
                </HelperText>
              ) : doctorsInDept.length === 0 ? (
                <HelperText type="info" visible>
                  No doctors listed for this department.
                </HelperText>
              ) : (
                <View style={styles.doctorRadioCard}>
                  <RadioButton.Group
                    value={
                      selectedDoctor
                        ? String(selectedDoctor.id)
                        : ''
                    }
                    onValueChange={(value) => {
                      const id = Number(value);
                      const next = doctorsInDept.find((doc) => doc.id === id);
                      if (next) setSelectedDoctor(next);
                    }}>
                    {doctorsInDept.map((d) => (
                      <RadioButton.Item
                        key={d.id}
                        value={String(d.id)}
                        label={`${d.name}${d.available ? '' : ' (off roster)'} · ${d.timing}`}
                        position="leading"
                        style={styles.radioItem}
                      />
                    ))}
                  </RadioButton.Group>
                </View>
              )}
            </Card.Content>
          </Card>

          <Card style={[clinicScreen.card, styles.card, styles.sectionCard]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Services
              </Text>
              <Text variant="bodySmall" style={styles.muted}>
                Tap to add or remove. Enter amount for each selected service.
              </Text>
              <View style={styles.chipWrap}>
                {DEFAULT_VISIT_SERVICES.map((name) => (
                  <Chip
                    key={name}
                    mode="flat"
                    selected={selectedServices.includes(name)}
                    onPress={() => toggleService(name)}
                    style={[
                      styles.chip,
                      selectedServices.includes(name) && styles.chipSelected,
                    ]}
                    textStyle={
                      selectedServices.includes(name)
                        ? styles.chipTextSelected
                        : styles.chipText
                    }>
                    {name}
                  </Chip>
                ))}
              </View>
              {selectedServices.length === 0 ? (
                <HelperText type="info" visible>
                  Select at least one service to continue.
                </HelperText>
              ) : null}
              {selectedServices.length > 0 ? (
                <View style={styles.serviceBillingBlock}>
                  <Text variant="labelLarge" style={styles.fieldLabel}>
                    Service billing
                  </Text>
                  {selectedServices.map((service) => (
                    <View key={service} style={styles.serviceAmountRow}>
                      <Text variant="bodyMedium" style={styles.serviceAmountLabel}>
                        {service}
                      </Text>
                      <TextInput
                        label="Amount (₹)"
                        value={serviceAmounts[service] ?? ''}
                        onChangeText={(v) => setAmountForService(service, v)}
                        mode="outlined"
                        {...inputFocusProps}
                        keyboardType="decimal-pad"
                        style={styles.serviceAmountInput}
                        disabled={saving}
                      />
                    </View>
                  ))}
                  <View style={styles.totalRow}>
                    <Text variant="titleSmall" style={styles.totalLabel}>
                      Total
                    </Text>
                    <Text variant="titleSmall" style={styles.totalValue}>
                      ₹ {totalAmount.toFixed(2)}
                    </Text>
                  </View>
                </View>
              ) : null}
            </Card.Content>
          </Card>

          <Card style={[clinicScreen.card, styles.card, styles.sectionCard]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Visit notes
              </Text>
              <TextInput
                label="Chief complaint / visit notes"
                value={symptoms}
                onChangeText={setSymptoms}
                mode="outlined"
                {...inputFocusProps}
                multiline
                numberOfLines={4}
                style={styles.input}
                disabled={saving}
              />
            </Card.Content>
          </Card>

          <Card style={[clinicScreen.card, styles.card, styles.sectionCard]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Files (optional)
              </Text>
              <Text variant="bodySmall" style={styles.muted}>
                Photos appear below each row. In the camera, use Use photo then
                Done when finished.
              </Text>
              {INTAKE_UPLOAD_ROWS.map(({ category, label, icon }) => (
                <IntakeAttachmentRow
                  key={category}
                  label={label}
                  icon={icon}
                  assets={assets[category]}
                  disabled={saving}
                  busy={
                    upload.isPending && upload.variables?.category === category
                  }
                  showCamera={showCamera}
                  onPickDocument={() => void onPickDocument(category)}
                  onPickPhoto={() => setCameraCategory(category)}
                  onRemoveAt={(index) => removeAssetAt(category, index)}
                  onClearAll={() =>
                    setAssets((prev) => ({ ...prev, [category]: [] }))
                  }
                />
              ))}
            </Card.Content>
          </Card>

          <Button
            mode="contained"
            onPress={() => void onCompleteVisit()}
            loading={saving}
            disabled={!canComplete}
            style={[clinicScreen.button, styles.completeCta]}
            contentStyle={clinicScreen.buttonContent}>
            Complete visit &amp; open claim
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <LoadingOverlay visible={saving} message="Saving visit…" />

      <ClaimCameraModal
        visible={cameraCategory != null}
        onClose={() => setCameraCategory(null)}
        onCaptured={onCameraCaptured}
        allowMultiple
        stagedAssets={
          cameraCategory != null ? assets[cameraCategory] : []
        }
        onRemoveStaged={(index) => {
          if (cameraCategory == null) return;
          removeAssetAt(cameraCategory, index);
        }}
      />
    </SafeAreaView>
  );
}

const PHOTO = 56;
const PHOTO_R = 28;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { paddingTop: spacing.sm, paddingBottom: spacing.xl * 2 },
  hero: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroKicker: {
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  intro: { color: colors.textMuted, lineHeight: 22 },
  card: { marginBottom: spacing.md },
  sectionCard: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  patientCard: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  patientPhoto: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: PHOTO_R,
    backgroundColor: colors.border,
    borderWidth: 2,
    borderColor: colors.surfaceVariant,
  },
  patientText: { flex: 1, minWidth: 0 },
  muted: { color: colors.textMuted, marginTop: 4 },
  cardTitle: {
    ...typography.title,
    marginBottom: spacing.md,
    fontWeight: '700',
    color: colors.secondary,
    fontSize: 18,
  },
  fieldLabel: { marginBottom: spacing.xs, color: colors.secondary },
  mt: { marginTop: spacing.md },
  menuBtn: { alignSelf: 'stretch', borderColor: colors.border },
  menuBtnRaised: { backgroundColor: colors.surface },
  menuBtnContent: { justifyContent: 'flex-start' },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: { marginBottom: 0, backgroundColor: colors.surfaceVariant },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { color: colors.secondary },
  chipTextSelected: { color: colors.onPrimary, fontWeight: '600' },
  serviceBillingBlock: {
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  serviceAmountRow: {
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.sm,
    backgroundColor: colors.surface,
  },
  serviceAmountLabel: {
    color: colors.secondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  serviceAmountInput: {
    backgroundColor: colors.surface,
  },
  totalRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: colors.textMuted,
  },
  totalValue: {
    color: colors.secondary,
    fontWeight: '700',
  },
  completeCta: { marginTop: spacing.sm, borderRadius: radii.button },
  input: { marginBottom: spacing.md, backgroundColor: colors.surface },
  errorText: { color: colors.error, marginBottom: spacing.sm },
  attachRow: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  attachHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  attachLabel: {
    ...typography.title,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  attachFile: { ...typography.small, marginBottom: spacing.sm },
  /** Explicit height so nested horizontal ScrollView is not collapsed inside the page ScrollView. */
  attachThumbStrip: {
    height: 100,
    marginBottom: spacing.sm,
    width: '100%',
  },
  attachThumbScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.sm,
    minHeight: 96,
  },
  attachThumbWrap: {
    width: 88,
    height: 88,
    marginRight: spacing.sm,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surfaceVariant,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  attachThumbWrapSelected: {
    borderColor: colors.primary,
  },
  attachThumbWrapPressed: {
    opacity: 0.85,
  },
  attachThumbHit: {
    width: 88,
    height: 88,
  },
  attachThumbImage: {
    width: 88,
    height: 88,
  },
  attachThumbDoc: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  attachThumbDocText: {
    textAlign: 'center',
    fontSize: 10,
    color: colors.text,
  },
  attachThumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    margin: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    zIndex: 2,
  },
  attachLargePreviewWrap: {
    marginBottom: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceVariant,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  attachLargePreviewLabel: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: 2,
    color: colors.textMuted,
  },
  attachLargePreview: {
    width: '100%',
    height: 220,
    backgroundColor: '#0a0a0a',
  },
  attachLargeDoc: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  attachLargeDocText: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  attachActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  doctorRadioCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  radioItem: {
    paddingVertical: 4,
    backgroundColor: colors.surface,
  },
  attachBtn: { marginRight: 0 },
});
