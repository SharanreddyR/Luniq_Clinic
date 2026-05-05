import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  Card,
  Chip,
  Dialog,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompactScreenHeader } from '@/components/ui/CompactScreenHeader';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { useAppToast } from '@/hooks/useAppToast';
import { useClinicAppointments } from '@/hooks/useAppointments';
import {
  useConfirmClinicAppointment,
  useRejectClinicAppointment,
} from '@/hooks/useClinicAppointmentMutations';
import {
  type ClinicAppointment,
  type ClinicAppointmentStatus,
  CLINIC_APPOINTMENT_STATUSES,
  appointmentApiErrorMessage,
  partitionAppointmentsByDay,
} from '@/services/appointmentService';

const STATUS_LABELS: Record<ClinicAppointmentStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

function formatSlot(item: ClinicAppointment): string {
  const d = new Date(item.startsAt);
  if (!Number.isNaN(d.getTime()) && d.getTime() !== 0) {
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return `${item.dateLabel} · ${item.timeLabel}`;
}

function dialUrl(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  return `tel:${digits}`;
}

export default function AppointmentsScreen() {
  const [statusFilter, setStatusFilter] =
    useState<ClinicAppointmentStatus>('pending');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const query = useClinicAppointments(statusFilter);
  const confirmMut = useConfirmClinicAppointment();
  const rejectMut = useRejectClinicAppointment();
  const { showSuccess, showError } = useAppToast();

  const list = query.data ?? [];
  const { today, upcoming } = useMemo(
    () => partitionAppointmentsByDay(list),
    [list],
  );

  const confirmAppt = useMemo(() => {
    if (!confirmId) return null;
    return list.find((a) => a.id === confirmId) ?? null;
  }, [confirmId, list]);

  const rejectAppt = useMemo(() => {
    if (!rejectId) return null;
    return list.find((a) => a.id === rejectId) ?? null;
  }, [rejectId, list]);

  const apiBusy = confirmMut.isPending || rejectMut.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <CompactScreenHeader title="Appointments" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}>
        {CLINIC_APPOINTMENT_STATUSES.map((s) => (
          <Chip
            key={s}
            selected={statusFilter === s}
            onPress={() => setStatusFilter(s)}
            style={[
              styles.filterChip,
              statusFilter === s ? styles.filterChipSelected : styles.filterChipUnselected,
            ]}
            mode={statusFilter === s ? 'flat' : 'outlined'}
            textStyle={styles.filterChipLabel}
            showSelectedOverlay={false}>
            {STATUS_LABELS[s]}
          </Chip>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching && !query.isPending}
            onRefresh={() => void query.refetch()}
            tintColor={colors.primary}
          />
        }>
        {query.isPending && !query.data ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text variant="bodyMedium" style={styles.muted}>
              Loading appointments…
            </Text>
          </View>
        ) : list.length === 0 ? (
          <EmptyCard
            message={`No ${STATUS_LABELS[statusFilter].toLowerCase()} appointments.`}
          />
        ) : (
          <>
            <SectionTitle title="Today’s appointments" />
            {today.length === 0 ? (
              <EmptyCard message="None scheduled for today in this list." />
            ) : (
              today.map((item) => (
                <AppointmentCard
                  key={item.id}
                  item={item}
                  listStatus={statusFilter}
                  apiBusy={apiBusy}
                  confirming={
                    confirmMut.isPending && confirmMut.variables?.id === item.id
                  }
                  rejecting={
                    rejectMut.isPending && rejectMut.variables?.id === item.id
                  }
                  onConfirm={() => {
                    setConfirmNotes('');
                    setConfirmId(item.id);
                  }}
                  onReject={() => {
                    setRejectReason('');
                    setRejectId(item.id);
                  }}
                  onCall={() => {
                    if (!item.contactPhone) return;
                    void Linking.openURL(dialUrl(item.contactPhone));
                  }}
                />
              ))
            )}

            <SectionTitle title="Later" />
            {upcoming.length === 0 ? (
              <EmptyCard message="No further appointments in this list." />
            ) : (
              upcoming.map((item) => (
                <AppointmentCard
                  key={item.id}
                  item={item}
                  listStatus={statusFilter}
                  apiBusy={apiBusy}
                  confirming={
                    confirmMut.isPending && confirmMut.variables?.id === item.id
                  }
                  rejecting={
                    rejectMut.isPending && rejectMut.variables?.id === item.id
                  }
                  onConfirm={() => {
                    setConfirmNotes('');
                    setConfirmId(item.id);
                  }}
                  onReject={() => {
                    setRejectReason('');
                    setRejectId(item.id);
                  }}
                  onCall={() => {
                    if (!item.contactPhone) return;
                    void Linking.openURL(dialUrl(item.contactPhone));
                  }}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      <Portal>
        <Dialog
          visible={confirmId != null}
          onDismiss={() => !apiBusy && setConfirmId(null)}
          style={styles.dialog}>
          <Dialog.Title>Confirm appointment</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogBody}>
              {confirmAppt
                ? `${confirmAppt.patientName} · ${formatSlot(confirmAppt)}`
                : ''}
            </Text>
            <TextInput
              mode="outlined"
              label="Notes for patient (optional)"
              value={confirmNotes}
              onChangeText={setConfirmNotes}
              multiline
              numberOfLines={3}
              style={styles.input}
              disabled={apiBusy}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmId(null)} disabled={apiBusy}>
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={confirmMut.isPending}
              disabled={apiBusy || !confirmId}
              onPress={() => {
                if (!confirmId) return;
                confirmMut.mutate(
                  { id: confirmId, notes: confirmNotes.trim() || null },
                  {
                    onSuccess: () => {
                      showSuccess('Appointment confirmed');
                      setConfirmId(null);
                    },
                    onError: (err) => {
                      showError(appointmentApiErrorMessage(err, 'Confirm failed'));
                    },
                  },
                );
              }}>
              Confirm
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={rejectId != null}
          onDismiss={() => !apiBusy && setRejectId(null)}
          style={styles.dialog}>
          <Dialog.Title>Reject appointment</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogBody}>
              {rejectAppt
                ? `${rejectAppt.patientName} · ${formatSlot(rejectAppt)}`
                : ''}
            </Text>
            <TextInput
              mode="outlined"
              label="Reason (required)"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              style={styles.input}
              disabled={apiBusy}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRejectId(null)} disabled={apiBusy}>
              Cancel
            </Button>
            <Button
              mode="contained"
              buttonColor={colors.error}
              loading={rejectMut.isPending}
              disabled={apiBusy || !rejectReason.trim() || !rejectId}
              onPress={() => {
                if (!rejectId || !rejectReason.trim()) return;
                rejectMut.mutate(
                  { id: rejectId, reason: rejectReason.trim() },
                  {
                    onSuccess: () => {
                      showSuccess('Appointment rejected');
                      setRejectId(null);
                      setRejectReason('');
                    },
                    onError: (err) => {
                      showError(appointmentApiErrorMessage(err, 'Reject failed'));
                    },
                  },
                );
              }}>
              Reject
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <LoadingOverlay
        visible={apiBusy}
        message={confirmMut.isPending ? 'Confirming…' : 'Rejecting…'}
      />
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text variant="titleMedium" style={[typography.title, styles.sectionTitle]}>
      {title}
    </Text>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <Card style={[clinicScreen.card, styles.card]} mode="outlined">
      <Card.Content>
        <Text variant="bodyMedium" style={styles.empty}>
          {message}
        </Text>
      </Card.Content>
    </Card>
  );
}

function statusChipStyle(status: ClinicAppointmentStatus): { bg: string } {
  switch (status) {
    case 'pending':
      return { bg: colors.surfaceVariant };
    case 'confirmed':
      return { bg: 'rgba(27, 122, 108, 0.14)' };
    case 'completed':
      return { bg: 'rgba(59, 91, 140, 0.12)' };
    case 'rejected':
      return { bg: 'rgba(176, 0, 32, 0.1)' };
    case 'cancelled':
    default:
      return { bg: colors.surfaceVariant };
  }
}

function AppointmentCard({
  item,
  listStatus,
  apiBusy,
  confirming,
  rejecting,
  onConfirm,
  onReject,
  onCall,
}: {
  item: ClinicAppointment;
  listStatus: ClinicAppointmentStatus;
  apiBusy: boolean;
  confirming: boolean;
  rejecting: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onCall: () => void;
}) {
  const statusBg = statusChipStyle(item.status).bg;
  const showActions = listStatus === 'pending' && item.status === 'pending';
  const canCall = Boolean(item.contactPhone?.trim());

  return (
    <Card style={[clinicScreen.card, styles.card]} mode="elevated">
      <Card.Content>
        <View style={styles.cardTop}>
          <View style={styles.cardMain}>
            <Text variant="titleMedium" style={styles.patient}>
              {item.patientName}
            </Text>
            <Text variant="bodySmall" style={styles.metaLine}>
              {[item.patientAge != null ? `${item.patientAge} yrs` : null, item.patientGender]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <Text variant="bodyMedium" style={styles.doctor}>
              {item.doctorName}
            </Text>
            <Text variant="bodySmall" style={styles.time}>
              {formatSlot(item)}
            </Text>
            {item.reason ? (
              <Text variant="bodySmall" style={styles.reason}>
                {item.reason}
              </Text>
            ) : null}
            {item.contactName || item.contactPhone ? (
              <Text variant="bodySmall" style={styles.contact}>
                {[item.contactName, item.contactPhone].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>
          <Chip
            compact
            mode="flat"
            style={[styles.statusChip, { backgroundColor: statusBg }]}
            textStyle={styles.statusChipLabel}>
            {STATUS_LABELS[item.status]}
          </Chip>
        </View>
        <View style={styles.actions}>
          {canCall ? (
            <Button
              mode="outlined"
              onPress={onCall}
              disabled={apiBusy}
              style={[clinicScreen.buttonCompact, styles.actionBtn]}
              contentStyle={clinicScreen.buttonContentCompact}>
              Call
            </Button>
          ) : null}
          {showActions ? (
            <>
              <Button
                mode="outlined"
                onPress={onReject}
                loading={rejecting}
                disabled={apiBusy}
                textColor={colors.error}
                style={[clinicScreen.buttonCompact, styles.actionBtn]}
                contentStyle={clinicScreen.buttonContentCompact}>
                Reject
              </Button>
              <Button
                mode="contained"
                onPress={onConfirm}
                loading={confirming}
                disabled={apiBusy}
                style={[clinicScreen.buttonCompact, styles.actionBtn]}
                contentStyle={clinicScreen.buttonContentCompact}>
                Confirm
              </Button>
            </>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterScroll: {
    maxHeight: 52,
    flexGrow: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    marginRight: 4,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
  },
  filterChipUnselected: {
    backgroundColor: colors.surface,
  },
  filterChipLabel: {
    color: '#000000',
    fontWeight: '600',
  },
  statusChipLabel: {
    color: '#000000',
    fontWeight: '600',
  },
  scroll: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: 12,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardMain: {
    flex: 1,
    minWidth: 0,
  },
  patient: {
    color: colors.secondary,
    fontWeight: '700',
  },
  metaLine: {
    color: colors.textMuted,
    marginTop: 2,
  },
  doctor: {
    color: colors.text,
    marginTop: 6,
  },
  time: {
    color: colors.textMuted,
    marginTop: 6,
  },
  reason: {
    color: colors.text,
    marginTop: 8,
    lineHeight: 20,
  },
  contact: {
    color: colors.textMuted,
    marginTop: 6,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    justifyContent: 'flex-end',
  },
  actionBtn: {},
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  muted: {
    color: colors.textMuted,
    marginTop: 12,
    textAlign: 'center',
  },
  dialog: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: 14,
  },
  dialogBody: {
    color: colors.text,
    lineHeight: 22,
  },
  input: {
    marginTop: 12,
    backgroundColor: colors.surface,
  },
});
