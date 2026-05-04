import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  HelperText,
  IconButton,
  Menu,
  RadioButton,
  Text,
} from 'react-native-paper';

import { radii, spacing } from '@/constants';
import { colors } from '@/constants/Colors';
import { useDoctors } from '@/hooks/useDoctors';
import {
  fetchClinicVisitServicesCatalog,
  startClinicVisit,
} from '@/services/visitService';
import {
  useIntakeVisitHandoffStore,
  usePatientStore,
} from '@/store';
import type { PatientRecord } from '@/types/patient';
import { patientRecordForMember } from '@/utils/patientSelection';

import type { Doctor } from '@/services/doctorService';

type Props = {
  visible: boolean;
  base: PatientRecord | null;
  memberIndex: number | null;
  onClose: () => void;
  /** Runs after handoff + active patient are saved (toast/navigation/cleanup in parent). */
  onVisitStarted: () => void;
};

export function StartVisitDoctorModal({
  visible,
  base,
  memberIndex,
  onClose,
  onVisitStarted,
}: Props) {
  const setHandoff = useIntakeVisitHandoffStore((s) => s.setHandoff);
  const setActivePatient = usePatientStore((s) => s.setActivePatient);

  const doctorsQuery = useDoctors();
  const [modalDepartment, setModalDepartment] = useState<string | null>(null);
  const [modalDoctor, setModalDoctor] = useState<Doctor | null>(null);
  const [deptMenuOpen, setDeptMenuOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const allDoctors = doctorsQuery.data ?? [];
  const modalDepartments = useMemo(() => {
    const d = new Set(
      allDoctors.map((x) => x.department).filter((s) => s.trim().length > 0),
    );
    return [...d].sort((a, b) => a.localeCompare(b));
  }, [allDoctors]);

  const modalDoctorsInDept = useMemo(() => {
    if (!modalDepartment) return [];
    return allDoctors.filter((doc) => doc.department === modalDepartment);
  }, [allDoctors, modalDepartment]);

  useEffect(() => {
    if (!visible) return;
    setModalError(null);
    setModalDepartment(null);
    setModalDoctor(null);
    setDeptMenuOpen(false);
  }, [visible, base?.id, memberIndex]);

  useEffect(() => {
    if (!visible) return;
    if (modalDepartments.length === 0) return;
    setModalDepartment((prev) => prev ?? modalDepartments[0]);
  }, [visible, modalDepartments]);

  useEffect(() => {
    if (!visible || !modalDepartment) return;
    setModalDoctor((doc) => {
      if (doc && modalDoctorsInDept.some((d) => d.id === doc.id)) {
        return doc;
      }
      return (
        modalDoctorsInDept.find((d) => d.available) ??
        modalDoctorsInDept[0] ??
        null
      );
    });
  }, [visible, modalDepartment, modalDoctorsInDept]);

  function closeModal() {
    if (modalSubmitting) return;
    onClose();
    setModalError(null);
  }

  async function onStartVisit() {
    if (!base || !modalDoctor) return;
    const effective = patientRecordForMember(base, memberIndex);
    const hcId = effective.healthCardId;
    if (hcId == null || !Number.isFinite(Number(hcId))) {
      setModalError(
        'This patient record has no health card id — visits cannot be started on the server.',
      );
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      const visitMeta = await startClinicVisit({
        healthCardId: Number(hcId),
        personId: effective.id,
        doctorId: modalDoctor.id,
      });
      const catalog = await fetchClinicVisitServicesCatalog();
      setHandoff({
        visitId: visitMeta.visit_id,
        doctorId: modalDoctor.id,
        doctorName: modalDoctor.name,
        doctorDepartment: modalDoctor.department,
        visitMeta,
        catalog,
      });
      setActivePatient(effective);
      onVisitStarted();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not start visit.';
      setModalError(msg);
    } finally {
      setModalSubmitting(false);
    }
  }

  const patientLine =
    base != null ? patientRecordForMember(base, memberIndex).name : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={closeModal}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.doctorModalRoot}>
        <Pressable
          style={styles.doctorModalBackdrop}
          onPress={closeModal}
          disabled={modalSubmitting}
          accessibilityLabel="Dismiss"
        />
        <View style={styles.doctorModalSheet} pointerEvents="box-none">
          <View style={styles.doctorModalHeader}>
            <Text variant="titleLarge" style={styles.doctorModalTitle}>
              Select doctor
            </Text>
            <IconButton
              icon="close"
              onPress={closeModal}
              disabled={modalSubmitting}
              accessibilityLabel="Close"
            />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.doctorModalScroll}
            showsVerticalScrollIndicator={false}>
            {patientLine ? (
              <Text variant="bodySmall" style={styles.doctorModalPatient}>
                {patientLine}
              </Text>
            ) : null}
            {doctorsQuery.isPending && !doctorsQuery.data ? (
              <View style={styles.doctorModalLoad}>
                <ActivityIndicator color={colors.primary} />
                <Text variant="bodySmall" style={styles.mutedLoad}>
                  Loading doctors…
                </Text>
              </View>
            ) : null}
            {doctorsQuery.isError ? (
              <Text variant="bodySmall" style={styles.doctorModalErr}>
                Could not load doctors. Try again later.
              </Text>
            ) : null}
            <Text variant="labelLarge" style={styles.doctorFieldLabel}>
              Department
            </Text>
            <Menu
              visible={deptMenuOpen}
              onDismiss={() => setDeptMenuOpen(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setDeptMenuOpen(true)}
                  disabled={modalSubmitting || modalDepartments.length === 0}
                  style={styles.doctorMenuBtn}
                  contentStyle={styles.doctorMenuBtnContent}>
                  {modalDepartment ?? 'Choose department'}
                </Button>
              }>
              {modalDepartments.map((d) => (
                <Menu.Item
                  key={d}
                  title={d}
                  onPress={() => {
                    setModalDepartment(d);
                    setDeptMenuOpen(false);
                  }}
                />
              ))}
            </Menu>
            <Text
              variant="labelLarge"
              style={[styles.doctorFieldLabel, styles.doctorFieldSpacer]}>
              Doctor
            </Text>
            {!modalDepartment ? (
              <HelperText type="info" visible>
                Select a department to see doctors.
              </HelperText>
            ) : modalDoctorsInDept.length === 0 ? (
              <HelperText type="info" visible>
                No doctors listed for this department.
              </HelperText>
            ) : (
              <RadioButton.Group
                value={modalDoctor ? String(modalDoctor.id) : ''}
                onValueChange={(value) => {
                  const id = Number(value);
                  const next = modalDoctorsInDept.find((doc) => doc.id === id);
                  if (next) setModalDoctor(next);
                }}>
                {modalDoctorsInDept.map((d) => (
                  <RadioButton.Item
                    key={d.id}
                    value={String(d.id)}
                    label={`${d.name}${d.available ? '' : ' (off roster)'} · ${d.timing}`}
                    position="leading"
                  />
                ))}
              </RadioButton.Group>
            )}
            {modalError ? (
              <HelperText type="error" visible style={styles.modalErrText}>
                {modalError}
              </HelperText>
            ) : null}
          </ScrollView>
          <View style={styles.doctorModalFooter}>
            <Button
              mode="outlined"
              onPress={closeModal}
              disabled={modalSubmitting}
              style={styles.doctorModalFooterBtn}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={() => void onStartVisit()}
              loading={modalSubmitting}
              disabled={!modalDoctor || modalSubmitting}
              style={styles.doctorModalFooterBtn}>
              Next
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  doctorModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  doctorModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 45, 47, 0.45)',
  },
  doctorModalSheet: {
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  doctorModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingTop: spacing.sm,
  },
  doctorModalTitle: { color: colors.secondary, fontWeight: '700' },
  doctorModalScroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  doctorModalPatient: {
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  doctorModalLoad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  mutedLoad: { color: colors.textMuted },
  doctorModalErr: { color: '#991B1B', marginBottom: spacing.sm },
  doctorFieldLabel: { marginBottom: spacing.xs, color: colors.secondary },
  doctorFieldSpacer: { marginTop: spacing.md },
  doctorMenuBtn: {
    alignSelf: 'stretch',
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  doctorMenuBtnContent: { justifyContent: 'flex-start' },
  modalErrText: { marginTop: spacing.sm },
  doctorModalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  doctorModalFooterBtn: { flex: 1 },
});
