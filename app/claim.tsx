import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
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
import { INTAKE_UPLOAD_ROWS } from '@/constants/intakeUploads';
import { useAppToast } from '@/hooks/useAppToast';
import { useSubmitClaim } from '@/hooks/useSubmitClaim';
import {
  CLAIM_POST_VERIFICATION_MESSAGE,
  type ClaimPatientOption,
} from '@/services/claimService';
import { pickDocument } from '@/services/uploadService';
import {
  type ClaimDraftStagedFile,
  type VisitClaimDraft,
  useClaimDraftStore,
  usePatientStore,
} from '@/store';

type CameraSlot = 'prescription' | 'reports' | 'bills' | null;

const CLAIM_FALLBACK_PHOTO = 'https://via.placeholder.com/150';

const EMPTY_INTAKE_ATTACHMENTS: NonNullable<
  VisitClaimDraft['intakeAttachments']
> = {
  prescription: [],
  report: [],
  bill: [],
};

function countIntakeVisitFiles(
  ia: NonNullable<VisitClaimDraft['intakeAttachments']>,
): number {
  return ia.prescription.length + ia.report.length + ia.bill.length;
}

function stagedFileToPickerAsset(f: ClaimDraftStagedFile): DocumentPickerAsset {
  return {
    uri: f.uri,
    name: f.name ?? 'Document',
    mimeType: f.mimeType ?? undefined,
    lastModified: Date.now(),
  };
}

function isImageLikeStagedFile(f: ClaimDraftStagedFile): boolean {
  const mime = f.mimeType?.toLowerCase() ?? '';
  if (mime.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|heic|heif)(\?|$)/i.test(f.uri);
}

function VisitIntakeThumb({ file }: { file: ClaimDraftStagedFile }) {
  const imageLike = isImageLikeStagedFile(file);
  return (
    <View style={styles.visitIntakeThumb}>
      {imageLike ? (
        <Image
          source={{ uri: file.uri }}
          style={styles.visitIntakeThumbImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.visitIntakeThumbImage, styles.visitIntakeThumbDoc]}>
          <MaterialCommunityIcons
            name="file-document-outline"
            size={26}
            color={colors.primary}
          />
        </View>
      )}
      <Text variant="labelSmall" style={styles.visitIntakeThumbName} numberOfLines={2}>
        {file.name ?? 'File'}
      </Text>
    </View>
  );
}

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
  return out;
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
      <View style={styles.attachHeader}>
        <Text variant="titleSmall" style={styles.attachLabel}>
          {label}
        </Text>
        <View
          style={[
            styles.fileStatusPill,
            asset ? styles.fileStatusReady : styles.fileStatusMissing,
          ]}>
          <Text variant="labelSmall" style={styles.fileStatusText}>
            {asset ? 'Added' : 'Missing'}
          </Text>
        </View>
      </View>
      <View style={styles.fileNameWrap}>
        <Text variant="bodySmall" style={styles.attachFile} numberOfLines={1}>
          {asset?.name ?? 'No file chosen'}
        </Text>
      </View>
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
            icon="camera-outline"
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
            icon="close-circle-outline"
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
  const setActivePatient = usePatientStore((s) => s.setActivePatient);
  const clearVisitSession = usePatientStore((s) => s.clearVisitSession);
  const { showSuccess } = useAppToast();

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

    const ia = draft.intakeAttachments;
    if (ia) {
      const p0 = ia.prescription[0];
      const r0 = ia.report[0];
      const b0 = ia.bill[0];
      setPrescription(p0 ? stagedFileToPickerAsset(p0) : null);
      setBills(b0 ? stagedFileToPickerAsset(b0) : null);
      if (r0) {
        setReports(stagedFileToPickerAsset(r0));
      } else if (draft.pdfUri) {
        setReports({
          uri: draft.pdfUri,
          name: `Visit-summary-${draft.opdRef}.pdf`,
          mimeType: 'application/pdf',
          lastModified: Date.now(),
        });
      } else {
        setReports(null);
      }
    } else {
      setPrescription(null);
      setBills(null);
      if (draft.pdfUri) {
        setReports({
          uri: draft.pdfUri,
          name: `Visit-summary-${draft.opdRef}.pdf`,
          mimeType: 'application/pdf',
          lastModified: Date.now(),
        });
      } else {
        setReports(null);
      }
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

  const intakeForReview = draft?.intakeAttachments ?? EMPTY_INTAKE_ATTACHMENTS;

  const intakeVisitFileCount = useMemo(
    () => countIntakeVisitFiles(intakeForReview),
    [intakeForReview],
  );

  const hasVisitDocsOrPdf =
    !!draft && (intakeVisitFileCount > 0 || !!draft.pdfUri);

  const claimSlotFilledCount = [prescription, reports, bills].filter(Boolean)
    .length;

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
        onSuccess: (data) => {
          clearDraft();
          draftAppliedKey.current = null;
          setPrescription(null);
          setReports(null);
          setBills(null);
          clearVisitSession();
          if (
            !activePatient ||
            activePatient.id !== selectedPatient.id
          ) {
            setActivePatient({
              id: selectedPatient.id,
              name: selectedPatient.name,
              cardNumber: selectedPatient.cardNumber,
              photo: CLAIM_FALLBACK_PHOTO,
            });
          }
          router.replace('/patient-intake' as Href);
          requestAnimationFrame(() => {
            showSuccess(
              `Submitted · Claim ID ${data.claimId}. ${CLAIM_POST_VERIFICATION_MESSAGE}`,
            );
          });
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
        <View style={styles.flex}>
          <ScrollView
            contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <Text variant="labelLarge" style={styles.heroKicker}>
                    Step 3 of 3
                  </Text>
                </View>
                <View style={[styles.heroPill, canSubmit ? styles.heroPillReady : null]}>
                  <Text variant="labelSmall" style={styles.heroPillText}>
                    {canSubmit ? 'Ready to submit' : 'Action required'}
                  </Text>
                </View>
              </View>
              <Text variant="headlineSmall" style={styles.heroTitle}>
                Finalize claim package
              </Text>
              <Text variant="bodyMedium" style={styles.intro}>
                Review the documents from the Visit step, confirm patient details,
                then submit the claim when everything looks correct.
              </Text>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatCard}>
                <Text variant="labelSmall" style={styles.heroStatLabel}>
                  Patient
                </Text>
                <Text variant="titleSmall" style={styles.heroStatValue} numberOfLines={1}>
                  {selectedPatient ? selectedPatient.name : 'Not selected'}
                </Text>
              </View>
              <View style={styles.heroStatCard}>
                <Text variant="labelSmall" style={styles.heroStatLabel}>
                  Documents
                </Text>
                <Text variant="titleSmall" style={styles.heroStatValue}>
                  {claimSlotFilledCount}/3 claim slots
                  {intakeVisitFileCount > 0
                    ? ` · ${intakeVisitFileCount} from visit`
                    : ''}
                </Text>
              </View>
            </View>
            </View>

            {draft ? (
              <Card style={[clinicScreen.card, styles.summaryCard]} mode="elevated">
                <Card.Content style={styles.cardContent}>
                  <View style={styles.sectionTitleRow}>
                    <Text variant="titleMedium" style={styles.cardTitle}>
                      Visit summary
                    </Text>
                    <View style={styles.summaryRefPill}>
                      <Text variant="labelSmall" style={styles.summaryRefText}>
                        {draft.opdRef}
                      </Text>
                    </View>
                  </View>
                  <Text variant="bodyMedium" style={styles.summaryMain}>
                    {draft.patientName} · ₹{draft.amount}
                  </Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    {draft.services.join(' · ')}
                  </Text>
                </Card.Content>
              </Card>
            ) : null}

            {draft ? (
              <Card
                style={[clinicScreen.card, styles.visitReviewCard]}
                mode="elevated">
                <Card.Content style={styles.cardContent}>
                  <View style={styles.sectionTitleRow}>
                    <MaterialCommunityIcons
                      name="clipboard-check-outline"
                      size={22}
                      color={colors.primary}
                      style={styles.visitReviewIcon}
                    />
                    <Text variant="titleMedium" style={styles.cardTitle}>
                      Documents from your visit
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={styles.visitReviewLead}>
                    Quick check before you submit: these are the same files you added
                    on the Visit screen. The claim uses one attachment per category in
                    the next section (already filled for you when possible).
                  </Text>
                  {!hasVisitDocsOrPdf ? (
                    <HelperText type="info" visible style={styles.visitReviewEmpty}>
                      No prescription, report, or bill files were attached during the
                      visit. Add at least one document in Claim attachments below to
                      submit.
                    </HelperText>
                  ) : (
                    <>
                      {INTAKE_UPLOAD_ROWS.map(({ category, label }) => {
                        const files = intakeForReview[category];
                        if (!files.length) return null;
                        return (
                          <View key={category} style={styles.visitIntakeCategory}>
                            <Text
                              variant="labelLarge"
                              style={styles.visitIntakeLabel}>
                              {label}
                            </Text>
                            <ScrollView
                              horizontal
                              nestedScrollEnabled
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.visitIntakeThumbRow}>
                              {files.map((file, idx) => (
                                <VisitIntakeThumb
                                  key={`${category}-${file.uri}-${idx}`}
                                  file={file}
                                />
                              ))}
                            </ScrollView>
                          </View>
                        );
                      })}
                      {draft.pdfUri ? (
                        <View style={styles.visitPdfBanner}>
                          <MaterialCommunityIcons
                            name="file-pdf-box"
                            size={22}
                            color="#B91C1C"
                          />
                          <View style={styles.visitPdfBannerText}>
                            <Text variant="labelLarge" style={styles.visitPdfTitle}>
                              Visit summary PDF
                            </Text>
                            <Text variant="bodySmall" style={styles.muted}>
                              Included with this visit. It appears under Reports when
                              you did not attach a separate lab/report image.
                            </Text>
                          </View>
                        </View>
                      ) : null}
                    </>
                  )}
                </Card.Content>
              </Card>
            ) : null}

            <Card style={[clinicScreen.card, styles.sectionCard]} mode="elevated">
              <Card.Content style={styles.cardContent}>
                <View style={styles.sectionTitleRow}>
                  <Text variant="titleMedium" style={styles.cardTitle}>
                    Patient selection
                  </Text>
                </View>
                <Menu
                  visible={patientMenuOpen}
                  onDismiss={() => setPatientMenuOpen(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      icon="account-circle-outline"
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
                {patientOptions.length === 0 ? (
                  <View style={styles.emptyStateBox}>
                    <Text variant="bodyMedium" style={styles.emptyStateTitle}>
                      No patient selected
                    </Text>
                    <HelperText type="error" visible style={styles.emptyStateHint}>
                      Data not found. Select a patient from Patient Intake first.
                    </HelperText>
                  </View>
                ) : null}
              </Card.Content>
            </Card>

            <Card style={[clinicScreen.card, styles.sectionCard]} mode="elevated">
              <Card.Content style={styles.cardContent}>
                <View style={styles.sectionTitleRow}>
                  <Text variant="titleMedium" style={styles.cardTitle}>
                    Claim attachments
                  </Text>
                </View>
                <Text variant="bodySmall" style={styles.muted}>
                  These three slots are what gets sent when you tap Submit claim. They
                  are prefilled from your visit files when possible — change a slot
                  only if you need a different file.
                </Text>
                <View style={styles.attachMetaRow}>
                  <View style={[styles.attachMetaChip, styles.attachMetaChipDone]}>
                    <Text variant="labelSmall" style={styles.attachMetaText}>
                      {hasAttachment ? 'Minimum requirement met' : 'Upload required'}
                    </Text>
                  </View>
                  <View style={styles.attachMetaChip}>
                    <Text variant="labelSmall" style={styles.attachMetaText}>
                      Camera {showCamera ? 'enabled' : 'web upload only'}
                    </Text>
                  </View>
                </View>
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
                  <HelperText type="info" visible style={styles.attachHint}>
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
          </ScrollView>

          <View style={styles.footerBar}>
            <Button
              mode="contained"
              icon="send-circle-outline"
              onPress={onSubmit}
              loading={submit.isPending}
              disabled={!canSubmit}
              style={[clinicScreen.button, styles.submit]}
              contentStyle={[clinicScreen.buttonContent, styles.submitContent]}>
              Submit claim
            </Button>
            <Button
              mode="text"
              icon="clipboard-text-clock-outline"
              onPress={() => router.push('/claim-status' as Href)}
              disabled={submit.isPending}
              style={styles.trackLink}
              contentStyle={clinicScreen.buttonContentCompact}>
              Track claim status
            </Button>
          </View>
        </View>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  hero: {
    backgroundColor: '#F4FAFF',
    borderRadius: radii.card + 2,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#DCEAF7',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  heroBadge: {
    backgroundColor: '#EAF5FF',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  heroKicker: {
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  heroPill: {
    borderRadius: radii.pill,
    backgroundColor: '#EEF2F6',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  heroPillReady: {
    backgroundColor: '#DDF5E8',
  },
  heroPillText: {
    color: '#567086',
    fontWeight: '600',
  },
  heroTitle: {
    color: colors.secondary,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  intro: {
    color: colors.textMuted,
    lineHeight: 24,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: '#DCEAF7',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  heroStatLabel: {
    color: '#6B7C8F',
    marginBottom: spacing.xs / 2,
    fontWeight: '600',
  },
  heroStatValue: {
    color: colors.secondary,
    fontWeight: '700',
  },
  summaryCard: {
    marginBottom: spacing.xs,
    borderColor: '#DCEAF7',
    borderWidth: 1,
    borderRadius: radii.card + 2,
    backgroundColor: colors.surface,
    elevation: 0,
  },
  visitReviewCard: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: '#F8FDFB',
    marginBottom: spacing.xs,
  },
  visitReviewIcon: {
    marginRight: spacing.xs,
  },
  visitReviewLead: {
    ...typography.subtitle,
    color: colors.secondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  visitReviewEmpty: {
    marginTop: 0,
    marginBottom: 0,
  },
  summaryRefPill: {
    borderRadius: radii.pill,
    backgroundColor: '#EAF4FF',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  summaryRefText: {
    color: colors.primary,
    fontWeight: '700',
  },
  summaryMain: {
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: '#E8EDF2',
    borderRadius: radii.card + 2,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 1,
  },
  cardContent: {
    paddingVertical: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.title,
    fontWeight: '700',
    color: colors.secondary,
    fontSize: 17,
  },
  submitError: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.sm,
  },
  muted: {
    ...typography.subtitle,
    marginBottom: spacing.md,
    lineHeight: 20,
    color: '#6B7C8F',
  },
  attachMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  attachMetaChip: {
    borderRadius: radii.pill,
    backgroundColor: '#EEF3F7',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  attachMetaChipDone: {
    backgroundColor: '#DFF3E8',
  },
  attachMetaText: {
    color: '#567086',
    fontWeight: '600',
  },
  menuBtn: {
    alignSelf: 'stretch',
    borderColor: '#DEE7EE',
    borderRadius: radii.sm,
    backgroundColor: '#FAFCFE',
  },
  menuBtnContent: {
    justifyContent: 'flex-start',
    minHeight: 48,
  },
  emptyStateBox: {
    marginTop: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#E5EEF4',
    backgroundColor: '#F6FAFD',
    padding: spacing.md,
  },
  emptyStateTitle: {
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: 0,
  },
  emptyStateHint: {
    marginTop: 0,
    marginBottom: 0,
    paddingVertical: 0,
  },
  attachRow: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#E7EEF5',
    backgroundColor: '#FBFDFF',
  },
  attachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  attachLabel: {
    ...typography.title,
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
  },
  fileStatusPill: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  fileStatusReady: {
    backgroundColor: '#DFF3E8',
  },
  fileStatusMissing: {
    backgroundColor: '#EEF3F7',
  },
  fileStatusText: {
    color: '#445A6F',
    fontWeight: '600',
  },
  fileNameWrap: {
    borderRadius: radii.sm,
    backgroundColor: '#F3F7FA',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  attachFile: {
    ...typography.small,
    color: colors.textMuted,
  },
  attachActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  attachBtn: {
    marginRight: 0,
    borderRadius: radii.sm,
  },
  attachHint: {
    marginTop: spacing.xs,
  },
  visitIntakeCategory: {
    marginTop: spacing.md,
  },
  visitIntakeLabel: {
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  visitIntakeThumbRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  visitIntakeThumb: {
    width: 128,
  },
  visitIntakeThumbImage: {
    width: 128,
    height: 128,
    borderRadius: radii.sm,
    backgroundColor: '#EEF3F7',
    borderWidth: 1,
    borderColor: '#DCE8F0',
    overflow: 'hidden',
  },
  visitIntakeThumbDoc: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitIntakeThumbName: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  visitPdfBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  visitPdfBannerText: {
    flex: 1,
    minWidth: 0,
  },
  visitPdfTitle: {
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: 4,
  },
  submit: {
    borderRadius: radii.button + 2,
    backgroundColor: '#1667D9',
  },
  submitContent: {
    minHeight: 50,
  },
  trackLink: {
    marginTop: spacing.xs / 2,
    borderRadius: radii.sm,
  },
  footerBar: {
    borderTopWidth: 1,
    borderTopColor: '#E6EDF4',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
});
