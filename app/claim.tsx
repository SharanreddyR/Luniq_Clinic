import type { DocumentPickerAsset } from 'expo-document-picker';
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Appbar,
  Button,
  Card,
  HelperText,
  Menu,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { useAppToast } from '@/hooks/useAppToast';
import { useSubmitClaim } from '@/hooks/useSubmitClaim';
import {
  CLAIM_POST_VERIFICATION_MESSAGE,
  MOCK_SELECTABLE_CLAIM_PATIENTS,
  type ClaimPatientOption,
} from '@/services/claimService';
import { pickDocument } from '@/services/uploadService';
import { usePatientStore } from '@/store';

function mergePatientOptions(
  active: { id: number; name: string; cardNumber: string } | null,
): ClaimPatientOption[] {
  const mock = [...MOCK_SELECTABLE_CLAIM_PATIENTS];
  if (!active) return mock;
  const rest = mock.filter((p) => p.id !== active.id);
  return [
    { id: active.id, name: active.name, cardNumber: active.cardNumber },
    ...rest,
  ];
}

function AttachmentRow({
  label,
  asset,
  onPick,
  onClear,
  disabled,
}: {
  label: string;
  asset: DocumentPickerAsset | null;
  onPick: () => void;
  onClear: () => void;
  disabled: boolean;
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
          onPress={onPick}
          disabled={disabled}
          style={clinicScreen.buttonCompact}
          contentStyle={clinicScreen.buttonContentCompact}>
          Choose
        </Button>
        {asset ? (
          <Button
            mode="text"
            onPress={onClear}
            disabled={disabled}
            style={clinicScreen.buttonCompact}
            contentStyle={clinicScreen.buttonContentCompact}>
            Clear
          </Button>
        ) : null}
      </View>
    </View>
  );
}

export default function ClaimSubmissionScreen() {
  const activePatient = usePatientStore((s) => s.activePatient);
  const patientOptions = useMemo(
    () => mergePatientOptions(activePatient),
    [activePatient],
  );

  const [patientMenuOpen, setPatientMenuOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    null,
  );

  const [prescription, setPrescription] =
    useState<DocumentPickerAsset | null>(null);
  const [reports, setReports] = useState<DocumentPickerAsset | null>(null);
  const [bills, setBills] = useState<DocumentPickerAsset | null>(null);

  const [lastClaimId, setLastClaimId] = useState<string | null>(null);

  const submit = useSubmitClaim();
  const { showSuccess, showError } = useAppToast();

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
    selectedPatient != null &&
    hasAttachment &&
    !submit.isPending;

  async function onSubmit() {
    if (!selectedPatient) return;
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
          setLastClaimId(data.claimId);
          setPrescription(null);
          setReports(null);
          setBills(null);
          showSuccess(CLAIM_POST_VERIFICATION_MESSAGE);
        },
        onError: (err) => {
          showError(
            err instanceof Error ? err.message : 'Could not submit claim',
          );
        },
      },
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Appbar.Header mode="center-aligned" style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title="Claim submission"
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
          <Text variant="bodyMedium" style={styles.intro}>
            Select the patient, attach supporting documents, and submit via
            POST /claim.
          </Text>

          <Card style={[clinicScreen.card, styles.card]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Select patient
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

          <Card style={[clinicScreen.card, styles.card]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Attach documents
              </Text>
              <Text variant="bodySmall" style={styles.muted}>
                Add one or more: prescription, reports, and bills.
              </Text>
              <AttachmentRow
                label="Prescription"
                asset={prescription}
                disabled={submit.isPending}
                onPick={async () => {
                  const a = await pickDocument();
                  if (a) setPrescription(a);
                }}
                onClear={() => setPrescription(null)}
              />
              <AttachmentRow
                label="Reports"
                asset={reports}
                disabled={submit.isPending}
                onPick={async () => {
                  const a = await pickDocument();
                  if (a) setReports(a);
                }}
                onClear={() => setReports(null)}
              />
              <AttachmentRow
                label="Bills"
                asset={bills}
                disabled={submit.isPending}
                onPick={async () => {
                  const a = await pickDocument();
                  if (a) setBills(a);
                }}
                onClear={() => setBills(null)}
              />
              {!hasAttachment ? (
                <HelperText type="info" visible>
                  At least one attachment is required.
                </HelperText>
              ) : null}
            </Card.Content>
          </Card>

          {lastClaimId ? (
            <Card style={[clinicScreen.card, styles.successCard]} mode="outlined">
              <Card.Content>
                <Text variant="titleMedium" style={styles.successTitle}>
                  Claim received
                </Text>
                <Text variant="bodyLarge" style={styles.claimId}>
                  {lastClaimId}
                </Text>
                <Text variant="bodyMedium" style={styles.successBody}>
                  {CLAIM_POST_VERIFICATION_MESSAGE}
                </Text>
                <Text variant="bodySmall" style={styles.muted}>
                  Status: submitted
                </Text>
              </Card.Content>
            </Card>
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
            onPress={() =>
              router.push(
                (lastClaimId
                  ? `/claim-status?claimId=${encodeURIComponent(lastClaimId)}`
                  : '/claim-status') as Href,
              )
            }
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
  intro: {
    ...typography.subtitle,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: 0,
  },
  cardTitle: {
    ...typography.title,
    marginBottom: spacing.md,
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
    gap: 4,
  },
  successCard: {
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  successTitle: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  claimId: {
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  successBody: {
    ...typography.body,
    marginBottom: spacing.sm,
  },
  submit: {
    marginTop: spacing.sm,
  },
  trackLink: {
    marginTop: spacing.xs / 2,
  },
});
