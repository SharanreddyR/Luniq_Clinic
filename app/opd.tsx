import { router } from 'expo-router';
import { useState } from 'react';
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
  Divider,
  HelperText,
  RadioButton,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { useSaveOpdVisit } from '@/hooks/useSaveOpdVisit';
import {
  OPD_DOCTORS,
  generateSlipNumber,
} from '@/services/opdService';

export default function OpdScreen() {
  const [slipNumber, setSlipNumber] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string>('');
  const [patientCard, setPatientCard] = useState('');
  const [savedVisitId, setSavedVisitId] = useState<number | null>(null);
  const [snack, setSnack] = useState('');

  const saveVisit = useSaveOpdVisit();

  const selectedDoctor = OPD_DOCTORS.find(
    (d) => String(d.id) === doctorId,
  );

  function onGenerateSlip() {
    setSlipNumber(generateSlipNumber());
    setSavedVisitId(null);
  }

  function onSaveVisit() {
    if (!slipNumber || !selectedDoctor) return;
    saveVisit.mutate(
      {
        slipNumber,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        patientCardNumber: patientCard.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          setSavedVisitId(data.id);
          setSnack(data.message ?? 'Visit saved');
        },
        onError: (err) => {
          setSnack(err instanceof Error ? err.message : 'Could not save visit');
        },
      },
    );
  }

  function onNewVisit() {
    setSlipNumber(null);
    setDoctorId('');
    setPatientCard('');
    setSavedVisitId(null);
  }

  const canSave =
    !!slipNumber &&
    !!selectedDoctor &&
    !saveVisit.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Appbar.Header mode="center-aligned" style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="OPD" titleStyle={styles.headerTitle} />
      </Appbar.Header>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text variant="bodyMedium" style={styles.intro}>
            Generate a queue slip, assign a doctor, then save the visit.
          </Text>

          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                1. Generate slip
              </Text>
              {slipNumber ? (
                <View style={styles.slipBox}>
                  <Text variant="labelSmall" style={styles.slipLabel}>
                    Slip number
                  </Text>
                  <Text variant="headlineSmall" style={styles.slipValue}>
                    {slipNumber}
                  </Text>
                </View>
              ) : (
                <Text variant="bodyMedium" style={styles.muted}>
                  No slip yet — generate one for this patient.
                </Text>
              )}
              <Button
                mode="contained-tonal"
                onPress={onGenerateSlip}
                style={styles.cardBtn}
                textColor={colors.secondary}>
                {slipNumber ? 'Regenerate slip' : 'Generate slip'}
              </Button>
            </Card.Content>
          </Card>

          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                2. Assign doctor
              </Text>
              <RadioButton.Group
                value={doctorId}
                onValueChange={(v) => {
                  setDoctorId(v);
                  setSavedVisitId(null);
                }}>
                {OPD_DOCTORS.map((doc) => (
                  <RadioButton.Item
                    key={doc.id}
                    label={doc.name}
                    value={String(doc.id)}
                    position="leading"
                    labelStyle={styles.radioLabel}
                  />
                ))}
              </RadioButton.Group>
            </Card.Content>
          </Card>

          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                3. Save visit
              </Text>
              <Text variant="bodySmall" style={styles.muted}>
                Optional: patient card number for records.
              </Text>
              <TextInput
                label="Patient card number (optional)"
                value={patientCard}
                onChangeText={setPatientCard}
                mode="outlined"
                autoCapitalize="characters"
                style={styles.input}
              />
              <Button
                mode="contained"
                onPress={onSaveVisit}
                loading={saveVisit.isPending}
                disabled={!canSave}
                style={styles.saveBtn}
                contentStyle={styles.saveBtnContent}>
                Save visit
              </Button>
              {!slipNumber && (
                <HelperText type="info" visible>
                  Generate a slip before saving.
                </HelperText>
              )}
              {slipNumber && !doctorId && (
                <HelperText type="info" visible>
                  Select a doctor to continue.
                </HelperText>
              )}
            </Card.Content>
          </Card>

          {savedVisitId != null && (
            <Card style={[styles.card, styles.successCard]} mode="outlined">
              <Card.Content>
                <Text variant="titleMedium" style={styles.successTitle}>
                  Visit recorded
                </Text>
                <Text variant="bodyMedium" style={styles.successBody}>
                  Visit ID #{savedVisitId} · Slip {slipNumber}
                </Text>
                <Divider style={styles.divider} />
                <Button mode="outlined" onPress={onNewVisit}>
                  New visit
                </Button>
              </Card.Content>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={snack.length > 0}
        onDismiss={() => setSnack('')}
        duration={3000}
        style={styles.snack}>
        {snack}
      </Snackbar>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  intro: {
    color: colors.textMuted,
    marginBottom: 16,
    lineHeight: 22,
  },
  card: {
    marginBottom: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  cardTitle: {
    color: colors.secondary,
    fontWeight: '600',
    marginBottom: 12,
  },
  muted: {
    color: colors.textMuted,
    marginBottom: 12,
  },
  slipBox: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  slipLabel: {
    color: colors.textMuted,
    marginBottom: 4,
  },
  slipValue: {
    color: colors.secondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardBtn: {
    alignSelf: 'flex-start',
  },
  radioLabel: {
    color: colors.text,
  },
  input: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: colors.surface,
  },
  saveBtn: {
    marginTop: 8,
    borderRadius: 8,
  },
  saveBtnContent: {
    paddingVertical: 6,
  },
  successCard: {
    borderColor: colors.primary,
  },
  successTitle: {
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: 6,
  },
  successBody: {
    color: colors.textMuted,
    marginBottom: 12,
  },
  divider: {
    marginVertical: 12,
    backgroundColor: colors.border,
  },
  snack: {
    marginBottom: 32,
  },
});
