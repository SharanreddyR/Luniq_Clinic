import type { DocumentPickerAsset } from 'expo-document-picker';
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Card, HelperText, Menu, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClaimCameraModal } from '@/components/ClaimCameraModal';
import { CompactScreenHeader } from '@/components/ui/CompactScreenHeader';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, radii, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { useSubmitClaim } from '@/hooks/useSubmitClaim';
import { MOCK_SELECTABLE_CLAIM_PATIENTS, type ClaimPatientOption } from '@/services/claimService';
import { pickDocument } from '@/services/uploadService';
import {
  type VisitClaimDraft,
  useClaimDraftStore,
  usePatientStore,
} from '@/store';

type CameraSlot = 'prescription' | 'reports' | 'bills' | null;

function mergePatientOptions(
  draft: VisitClaimDraft | null,
  active: { id: number; name: string; cardNumber: string } | null,
): ClaimPatientOption[] {
  const seen = new Set<number>();
  const out: ClaimPatientOption[] = [];
  if (draft) {
    out.push({
      id: draft.patientId,
      name: draft.patientName,
      cardNumber: draft.patientCardNumber,
    });
    seen.add(draft.patientId);
  }
  if (active && !seen.has(active.id)) {
    out.push({
      id: active.id,
      name: active.name,
      cardNumber: active.cardNumber,
    });
    seen.add(active.id);
  }
  for (const p of MOCK_SELECTABLE_CLAIM_PATIENTS) {
    if (!seen.has(p.id)) {
      out.push(p);
      seen.add(p.id);
    }
  }
  return out.length ? out : [...MOCK_SELECTABLE_CLAIM_PATIENTS];
}

function AttachmentRow({
  label,
  asset,
  onPickDocument,
  onPickPhoto,
  onClear,
  disabled,
  showCamera,
}: {
  label: string;
  asset: DocumentPickerAsset | null;
  onPickDocument: () => void;
  onPickPhoto: () => void;
  onClear: () => void;
  disabled: boolean;
  showCamera: boolean;
}) {
  return (
    <View style={styles.attachRow}>
      <Text variant="titleSmall" style={styles.attachLabel}>
        {label}
      </Text>
      <Text variant="bodySmall" style={styles.attachFile} numberOfLines={1}>
        {asset?.name ?? 'No file chosen'}
      </Text>
      <View style={styles.attachActions}>
        <Button
          mode="outlined"
          icon="folder-open"
          onPress={onPickDocument}
          disabled={disabled}
          style={styles.attachBtn}
          contentStyle={clinicScreen.buttonContentCompact}>
          Choose file
        </Button>
        {showCamera ? (
          <Button
            mode="outlined"
            icon="camera"
            onPress={onPickPhoto}
            disabled={disabled}
            style={styles.attachBtn}
            contentStyle={clinicScreen.buttonContentCompact}>
            Take photo
          </Button>
        ) : null}
        {asset ? (
          <Button
            mode="text"
            onPress={onClear}
            disabled={disabled}
            style={styles.attachBtn}
            contentStyle={clinicScreen.buttonContentCompact}>
            Clear
          </Button>
        ) : null}
      </View>
    </View>
  );
}

export default function ClaimSubmissionScreen() {
  const draft = useClaimDraftStore((s) => s.draft);
  const clearDraft = useClaimDraftStore((s) => s.clearDraft);
  const activePatient = usePatientStore((s) => s.activePatient);
  const clearActivePatient = usePatientStore((s) => s.clearActivePatient);
  const clearVisitSession = usePatientStore((s) => s.clearVisitSession);

  const patientOptions = useMemo(
    () => mergePatientOptions(draft, activePatient),
    [draft, activePatient],
  );

  const [patientMenuOpen, setPatientMenuOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    null,
  );

  const [prescription, setPrescription] =
    useState<DocumentPickerAsset | null>(null);
  const [reports, setReports] = useState<DocumentPickerAsset | null>(null);
  const [bills, setBills] = useState<DocumentPickerAsset | null>(null);

  const [cameraSlot, setCameraSlot] = useState<CameraSlot>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const draftAppliedKey = useRef<string | null>(null);

  const submit = useSubmitClaim();

  useEffect(() => {
    if (!draft) {
      draftAppliedKey.current = null;
      return;
    }
    const key = draft.opdRef;
    if (draftAppliedKey.current === key) return;
    draftAppliedKey.current = key;

    setSelectedPatientId(draft.patientId);
    if (draft.pdfUri) {
      setReports({
        uri: draft.pdfUri,
        name: `Visit-summary-${draft.opdRef}.pdf`,
        mimeType: 'application/pdf',
        lastModified: Date.now(),
      });
    }
  }, [draft]);

  useEffect(() => {
    setSelectedPatientId((prev) => {
      if (prev != null && patientOptions.some((p) => p.id === prev)) {
        return prev;
      }
      return patientOptions[0]?.id ?? null;
    });
  }, [patientOptions]);

  const selectedPatient = useMemo(
    () => patientOptions.find((p) => p.id === selectedPatientId) ?? null,
    [patientOptions, selectedPatientId],
  );

  const hasAttachment = !!(prescription || reports || bills);

  const canSubmit =
    selectedPatient != null && hasAttachment && !submit.isPending;

  const showCamera = Platform.OS !== 'web';

  function applyCameraCapture(asset: DocumentPickerAsset) {
    if (cameraSlot === 'prescription') setPrescription(asset);
    if (cameraSlot === 'reports') setReports(asset);
    if (cameraSlot === 'bills') setBills(asset);
    setCameraSlot(null);
  }

  function onSubmit() {
    if (!selectedPatient) return;
    setSubmitError(null);
    submit.mutate(
      {
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        patientCardNumber: selectedPatient.cardNumber,
        prescription,
        reports,
        bills,
      },
      {
        onSuccess: () => {
          clearDraft();
          draftAppliedKey.current = null;
          setPrescription(null);
          setReports(null);
          setBills(null);
          clearActivePatient();
          clearVisitSession();
          router.replace('/patient-intake' as Href);
        },
        onError: (err) => {
          setSubmitError(
            err instanceof Error ? err.message : 'Could not submit claim',
          );
        },
      },
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <CompactScreenHeader title="Claim" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text variant="labelLarge" style={styles.heroKicker}>
              Step 3 · Claim
            </Text>
            <Text variant="headlineSmall" style={styles.heroTitle}>
              Submit for review
            </Text>
            <Text variant="bodyMedium" style={styles.intro}>
              Check the patient and attachments, then submit. You will return to
              Find patient for the next walk-in.
            </Text>
          </View>

          {draft ? (
            <Card style={[clinicScreen.card, styles.draftCard]} mode="elevated">
              <Card.Content>
                <Text variant="titleSmall" style={styles.draftTitle}>
                  From this visit
                </Text>
                <Text variant="bodyMedium" style={styles.draftLine}>
                  Ref {draft.opdRef} · {draft.patientName} · ₹{draft.amount}
                </Text>
                <Text variant="bodySmall" style={styles.muted}>
                  {draft.services.join(' · ')}
                </Text>
              </Card.Content>
            </Card>
          ) : null}

          <Card style={[clinicScreen.card, styles.card, styles.sectionCard]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Patient
              </Text>
              <Menu
                visible={patientMenuOpen}
                onDismiss={() => setPatientMenuOpen(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setPatientMenuOpen(true)}
                    disabled={submit.isPending}
                    style={styles.menuBtn}
                    contentStyle={styles.menuBtnContent}>
                    {selectedPatient
                      ? `${selectedPatient.name} · ${selectedPatient.cardNumber}`
                      : 'Choose patient'}
                  </Button>
                }>
                {patientOptions.map((p) => (
                  <Menu.Item
                    key={p.id}
                    title={`${p.name} (${p.cardNumber})`}
                    onPress={() => {
                      setSelectedPatientId(p.id);
                      setPatientMenuOpen(false);
                    }}
                  />
                ))}
              </Menu>
            </Card.Content>
          </Card>

          <Card style={[clinicScreen.card, styles.card, styles.sectionCard]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Attachments
              </Text>
              <Text variant="bodySmall" style={styles.muted}>
                At least one file is required. Visit summary is pre-filled under
                Reports when available.
              </Text>
              <AttachmentRow
                label="Prescription"
                asset={prescription}
                disabled={submit.isPending}
                showCamera={showCamera}
                onPickDocument={async () => {
                  const a = await pickDocument();
                  if (a) setPrescription(a);
                }}
                onPickPhoto={() => setCameraSlot('prescription')}
                onClear={() => setPrescription(null)}
              />
              <AttachmentRow
                label="Reports"
                asset={reports}
                disabled={submit.isPending}
                showCamera={showCamera}
                onPickDocument={async () => {
                  const a = await pickDocument();
                  if (a) setReports(a);
                }}
                onPickPhoto={() => setCameraSlot('reports')}
                onClear={() => setReports(null)}
              />
              <AttachmentRow
                label="Bills"
                asset={bills}
                disabled={submit.isPending}
                showCamera={showCamera}
                onPickDocument={async () => {
                  const a = await pickDocument();
                  if (a) setBills(a);
                }}
                onPickPhoto={() => setCameraSlot('bills')}
                onClear={() => setBills(null)}
              />
              {!hasAttachment ? (
                <HelperText type="info" visible>
                  Add at least one attachment to submit.
                </HelperText>
              ) : null}
            </Card.Content>
          </Card>

          {submitError ? (
            <HelperText type="error" visible style={styles.submitError}>
              {submitError}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={onSubmit}
            loading={submit.isPending}
            disabled={!canSubmit}
            style={[clinicScreen.button, styles.submit]}
            contentStyle={clinicScreen.buttonContent}>
            Submit claim
          </Button>
          <Button
            mode="text"
            onPress={() => router.push('/claim-status' as Href)}
            disabled={submit.isPending}
            style={styles.trackLink}
            contentStyle={clinicScreen.buttonContentCompact}>
            Track claim status
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <LoadingOverlay
        visible={submit.isPending}
        message="Submitting claim…"
      />

      <ClaimCameraModal
        visible={cameraSlot != null}
        onClose={() => setCameraSlot(null)}
        onCaptured={applyCameraCapture}
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
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
  intro: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  draftCard: {
    marginBottom: spacing.md,
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
  draftTitle: {
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  draftLine: { color: colors.secondary },
  sectionCard: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.title,
    marginBottom: spacing.md,
    fontWeight: '700',
    color: colors.secondary,
    fontSize: 18,
  },
  submitError: {
    marginBottom: spacing.sm,
    marginHorizontal: spacing.xs,
  },
  muted: {
    ...typography.subtitle,
    marginBottom: spacing.md,
  },
  menuBtn: {
    alignSelf: 'stretch',
    borderColor: colors.border,
  },
  menuBtnContent: {
    justifyContent: 'flex-start',
  },
  attachRow: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  attachLabel: {
    ...typography.title,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  attachFile: {
    ...typography.small,
    marginBottom: spacing.sm,
  },
  attachActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  attachBtn: {
    marginRight: 0,
  },
  submit: {
    marginTop: spacing.sm,
  },
  trackLink: {
    marginTop: spacing.xs / 2,
  },
});
