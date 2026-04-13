import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { clinicScreen, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { useAppToast } from '@/hooks/useAppToast';
import { usePatientStore } from '@/store';
import type { PatientCardType, PatientRecord } from '@/types/patient';

const LINKED: PatientCardType[] = ['Family', 'Couple', 'Child'];

function parsePatientParam(
  raw: string | string[] | undefined,
): PatientRecord | null {
  if (raw == null) return null;
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s?.trim()) return null;
  try {
    const v = JSON.parse(s) as unknown;
    if (typeof v !== 'object' || v === null || !('id' in v) || !('name' in v)) {
      return null;
    }
    return v as PatientRecord;
  } catch {
    return null;
  }
}

export default function PatientVerificationScreen() {
  const params = useLocalSearchParams<{ patient?: string | string[] }>();
  const parsed = useMemo(
    () => parsePatientParam(params.patient),
    [params.patient],
  );
  const storePatient = usePatientStore((s) => s.activePatient);
  const setActivePatient = usePatientStore((s) => s.setActivePatient);
  const clearActivePatient = usePatientStore((s) => s.clearActivePatient);

  useEffect(() => {
    if (!parsed) return;
    setActivePatient(parsed);
  }, [parsed, setActivePatient]);

  const patient = parsed ?? storePatient;
  const { showSuccess, showInfo } = useAppToast();
  const [actionBusy, setActionBusy] = useState(false);

  function onConfirm() {
    if (actionBusy) return;
    setActionBusy(true);
    showSuccess('Patient confirmed. Opening OPD.');
    setTimeout(() => {
      router.replace('/opd' as Href);
    }, 400);
  }

  function onReject() {
    if (actionBusy) return;
    setActionBusy(true);
    clearActivePatient();
    showInfo('Patient cleared. Enter another card if needed.');
    setTimeout(() => {
      router.replace('/patient-lookup' as Href);
    }, 400);
  }

  if (!patient) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Appbar.Header mode="center-aligned" style={styles.header}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content
            title="Verify patient"
            titleStyle={clinicScreen.headerTitle}
          />
        </Appbar.Header>
        <View style={styles.emptyWrap}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            No patient loaded. Enter a card number first.
          </Text>
          <Button
            mode="contained"
            onPress={() => router.replace('/patient-lookup' as Href)}
            style={[clinicScreen.button, styles.emptyBtn]}
            contentStyle={clinicScreen.buttonContent}>
            Enter card number
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const members = patient.members ?? [];
  const showLinked =
    patient.cardType != null &&
    LINKED.includes(patient.cardType) &&
    members.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Appbar.Header mode="center-aligned" style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title="Verify patient"
          titleStyle={clinicScreen.headerTitle}
        />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text variant="titleLarge" style={styles.question}>
          Is this the correct patient?
        </Text>
        <Text variant="bodyMedium" style={styles.subQuestion}>
          Check the photo and card number before continuing.
        </Text>

        <View style={styles.hero}>
          <Image
            source={{ uri: patient.photo }}
            style={styles.heroPhoto}
            accessibilityLabel={`Photo of ${patient.name}`}
          />
          <Text variant="headlineSmall" style={styles.name}>
            {patient.name}
          </Text>
          <Text style={styles.cardLabel}>Card number</Text>
          <Text variant="titleLarge" style={styles.cardNumber} selectable>
            {patient.cardNumber}
          </Text>
        </View>

        <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={onConfirm}
          loading={actionBusy}
          disabled={actionBusy}
          buttonColor={colors.primary}
          textColor={colors.onPrimary}
          style={[clinicScreen.button, styles.actionBtn]}
          contentStyle={styles.actionBtnContent}
          labelStyle={styles.confirmLabel}>
          Confirm patient
        </Button>

        <Button
          mode="outlined"
          onPress={onReject}
          disabled={actionBusy}
          textColor={colors.error}
          style={[clinicScreen.button, styles.rejectBtn]}
          contentStyle={styles.actionBtnContent}
          labelStyle={styles.rejectLabel}>
          Reject
        </Button>
        </View>

        {showLinked ? (
          <View style={styles.linkedSection}>
            <Text variant="titleSmall" style={styles.linkedTitle}>
              Also on this card ({members.length})
            </Text>
            {members.map((m, i) => (
              <Card
                key={`${m.name}-${i}`}
                style={styles.linkedCard}
                mode="elevated">
                <Card.Content style={styles.linkedRow}>
                  <Image source={{ uri: m.photo }} style={styles.linkedPhoto} />
                  <View style={styles.linkedInfo}>
                    <Text variant="titleSmall" style={styles.linkedName}>
                      {m.name}
                    </Text>
                    <Text variant="bodySmall" style={styles.linkedMobile}>
                      {m.mobile}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Large verification photo — within 100–120pt range */
const PHOTO_SIZE = 120;
const PHOTO_RADIUS = PHOTO_SIZE / 2;

const ACTION_MIN_HEIGHT = 54;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    elevation: 0,
  },
  scroll: {
    paddingBottom: spacing.xl * 2,
  },
  question: {
    ...typography.title,
    fontSize: 20,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  subQuestion: {
    ...typography.subtitle,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  heroPhoto: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_RADIUS,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 3,
    borderColor: colors.primary,
    marginBottom: spacing.lg,
  },
  name: {
    color: colors.secondary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  cardLabel: {
    ...typography.small,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  cardNumber: {
    color: colors.secondary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    letterSpacing: 0.8,
    lineHeight: 30,
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  actionBtn: {
    marginBottom: 0,
  },
  actionBtnContent: {
    minHeight: ACTION_MIN_HEIGHT,
    paddingVertical: 14,
  },
  confirmLabel: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  rejectBtn: {
    borderColor: colors.error,
    borderWidth: 2,
    marginBottom: 0,
  },
  rejectLabel: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  linkedSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  linkedTitle: {
    ...typography.title,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  linkedCard: {
    ...clinicScreen.card,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  linkedPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceVariant,
  },
  linkedInfo: {
    flex: 1,
  },
  linkedName: {
    ...typography.title,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  linkedMobile: {
    ...typography.small,
    marginTop: 2,
  },
  emptyWrap: {
    flex: 1,
    padding: spacing.lg + spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.subtitle,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyBtn: {
    minWidth: 200,
  },
});
