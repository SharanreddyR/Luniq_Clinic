import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  RadioButton,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { useAppToast } from '@/hooks/useAppToast';
import { useCreateOpdSlip } from '@/hooks/useCreateOpdSlip';
import { useDoctorsByDepartment } from '@/hooks/useDoctorsByDepartment';
import { OPD_DEPARTMENTS } from '@/services/opdService';
import { usePatientStore } from '@/store';

export default function OpdSlipScreen() {
  const activePatient = usePatientStore((s) => s.activePatient);
  const patientName = activePatient?.name?.trim() ?? '';
  const patientDisplay = patientName || '—';

  const [department, setDepartment] = useState<string>(OPD_DEPARTMENTS[0]);
  const [deptMenuOpen, setDeptMenuOpen] = useState(false);
  const [doctorId, setDoctorId] = useState<string>('');
  const [symptoms, setSymptoms] = useState('');
  const [lastOpdId, setLastOpdId] = useState<string | null>(null);

  const doctorsQuery = useDoctorsByDepartment(department);
  const createSlip = useCreateOpdSlip();
  const { showSuccess, showError } = useAppToast();

  const doctors = doctorsQuery.data ?? [];
  const selectedDoctor = useMemo(
    () => doctors.find((d) => String(d.id) === doctorId),
    [doctors, doctorId],
  );

  useEffect(() => {
    if (doctors.length === 0) {
      setDoctorId('');
      return;
    }
    const valid = doctors.some((d) => String(d.id) === doctorId);
    if (!doctorId || !valid) {
      setDoctorId(String(doctors[0].id));
    }
  }, [doctors, doctorId]);

  function onDepartmentChange(next: string) {
    setDepartment(next);
    setDoctorId('');
    setDeptMenuOpen(false);
  }

  function onSubmit() {
    if (!selectedDoctor) return;
    createSlip.mutate(
      {
        patientName,
        department,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        symptoms: symptoms.trim(),
      },
      {
        onSuccess: (data) => {
          setLastOpdId(data.opdId);
          showSuccess('OPD slip generated');
        },
        onError: (err) => {
          showError(
            err instanceof Error ? err.message : 'Could not create OPD slip',
          );
        },
      },
    );
  }

  const canSubmit =
    patientName.length > 0 &&
    department.length > 0 &&
    !!selectedDoctor &&
    symptoms.trim().length > 0 &&
    !createSlip.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Appbar.Header mode="center-aligned" style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title="OPD slip"
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
          {!patientName ? (
            <HelperText type="info" visible style={styles.warn}>
              No patient in context. Verify a patient from the dashboard first.
            </HelperText>
          ) : null}

          <Card style={[clinicScreen.card, styles.card]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Patient
              </Text>
              <TextInput
                label="Patient name"
                value={patientDisplay}
                mode="outlined"
                editable={false}
                style={styles.input}
              />
            </Card.Content>
          </Card>

          <Card style={[clinicScreen.card, styles.card]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Department
              </Text>
              <Text variant="bodySmall" style={styles.hint}>
                Doctors load from GET /doctors?department=…
              </Text>
              <Menu
                visible={deptMenuOpen}
                onDismiss={() => setDeptMenuOpen(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setDeptMenuOpen(true)}
                    disabled={createSlip.isPending}
                    style={styles.menuBtn}
                    contentStyle={styles.menuBtnContent}>
                    {department}
                  </Button>
                }>
                {OPD_DEPARTMENTS.map((d) => (
                  <Menu.Item
                    key={d}
                    onPress={() => onDepartmentChange(d)}
                    title={d}
                  />
                ))}
              </Menu>
            </Card.Content>
          </Card>

          <Card style={[clinicScreen.card, styles.card]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Doctor
              </Text>
              {doctorsQuery.isFetching ? (
                <View style={styles.loadingDoctors}>
                  <ActivityIndicator color={colors.primary} />
                  <Text variant="bodyMedium" style={styles.muted}>
                    Loading doctors…
                  </Text>
                </View>
              ) : doctors.length === 0 ? (
                <Text variant="bodyMedium" style={styles.muted}>
                  No doctors for this department.
                </Text>
              ) : (
                <RadioButton.Group
                  value={doctorId}
                  onValueChange={setDoctorId}>
                  {doctors.map((doc) => (
                    <RadioButton.Item
                      key={doc.id}
                      label={`${doc.name}${doc.available ? '' : ' (off duty)'}`}
                      value={String(doc.id)}
                      position="leading"
                      labelStyle={styles.radioLabel}
                      disabled={createSlip.isPending}
                    />
                  ))}
                </RadioButton.Group>
              )}
            </Card.Content>
          </Card>

          <Card style={[clinicScreen.card, styles.card]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Symptoms
              </Text>
              <TextInput
                label="Chief complaint / symptoms"
                value={symptoms}
                onChangeText={setSymptoms}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={[styles.input, styles.symptomsInput]}
                placeholder="e.g. fever for 2 days, cough"
                disabled={createSlip.isPending}
              />
            </Card.Content>
          </Card>

          {lastOpdId ? (
            <Card style={[clinicScreen.card, styles.successCard]} mode="outlined">
              <Card.Content>
                <Text variant="titleMedium" style={styles.successTitle}>
                  OPD Slip Generated
                </Text>
                <Text variant="bodyLarge" style={styles.opdId}>
                  {lastOpdId}
                </Text>
                <Text variant="bodySmall" style={styles.muted}>
                  Status: created
                </Text>
              </Card.Content>
            </Card>
          ) : null}

          <Button
            mode="contained"
            onPress={onSubmit}
            loading={createSlip.isPending}
            disabled={!canSubmit}
            style={[clinicScreen.button, styles.submit]}
            contentStyle={clinicScreen.buttonContent}>
            Generate OPD slip
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <LoadingOverlay
        visible={createSlip.isPending}
        message="Submitting OPD slip…"
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
  warn: {
    ...typography.subtitle,
    marginBottom: spacing.sm,
  },
  card: {
    marginBottom: 0,
  },
  cardTitle: {
    ...typography.title,
    marginBottom: spacing.md,
  },
  hint: {
    ...typography.subtitle,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
  },
  symptomsInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  menuBtn: {
    alignSelf: 'flex-start',
    borderColor: colors.border,
  },
  menuBtnContent: {
    minWidth: 160,
  },
  loadingDoctors: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  muted: {
    ...typography.subtitle,
  },
  radioLabel: {
    color: colors.text,
  },
  successCard: {
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  successTitle: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  opdId: {
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  submit: {
    marginTop: 12,
  },
});
