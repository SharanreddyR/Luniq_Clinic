import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompactScreenHeader } from '@/components/ui/CompactScreenHeader';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { useAppToast } from '@/hooks/useAppToast';
import { useAppointments } from '@/hooks/useAppointments';
import { useCompleteAppointment } from '@/hooks/useCompleteAppointment';
import {
  type Appointment,
  partitionAppointmentsByDay,
} from '@/services/appointmentService';

function formatSlot(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AppointmentsScreen() {
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const query = useAppointments();
  const complete = useCompleteAppointment();
  const { showSuccess, showError } = useAppToast();

  const { today, upcoming } = useMemo(
    () => partitionAppointmentsByDay(query.data ?? []),
    [query.data],
  );

  const rescheduleAppt = useMemo(() => {
    if (!rescheduleId || !query.data) return null;
    return query.data.find((a) => a.id === rescheduleId) ?? null;
  }, [rescheduleId, query.data]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <CompactScreenHeader title="Appointments" />

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
        ) : (query.data?.length ?? 0) === 0 ? (
          <EmptyCard message="No appointments yet." />
        ) : (
          <>
            <SectionTitle title="Today’s appointments" />
            {today.length === 0 ? (
              <EmptyCard message="No appointments scheduled for today." />
            ) : (
              today.map((item) => (
                <AppointmentCard
                  key={item.id}
                  item={item}
                  completing={
                    complete.isPending && complete.variables === item.id
                  }
                  apiBusy={complete.isPending}
                  onComplete={() => {
                    complete.mutate(item.id, {
                      onSuccess: () => {
                        showSuccess('Visit marked completed');
                      },
                      onError: (err) => {
                        showError(
                          err instanceof Error
                            ? err.message
                            : 'Could not update appointment',
                        );
                      },
                    });
                  }}
                  onReschedule={() => setRescheduleId(item.id)}
                />
              ))
            )}

            <SectionTitle title="Upcoming appointments" />
            {upcoming.length === 0 ? (
              <EmptyCard message="No future appointments on the calendar." />
            ) : (
              upcoming.map((item) => (
                <AppointmentCard
                  key={item.id}
                  item={item}
                  completing={
                    complete.isPending && complete.variables === item.id
                  }
                  apiBusy={complete.isPending}
                  onComplete={() => {
                    complete.mutate(item.id, {
                      onSuccess: () => {
                        showSuccess('Visit marked completed');
                      },
                      onError: (err) => {
                        showError(
                          err instanceof Error
                            ? err.message
                            : 'Could not update appointment',
                        );
                      },
                    });
                  }}
                  onReschedule={() => setRescheduleId(item.id)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      <Portal>
        <Dialog
          visible={rescheduleId != null}
          onDismiss={() => setRescheduleId(null)}
          style={styles.dialog}>
          <Dialog.Title>Reschedule</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogBody}>
              {rescheduleAppt
                ? `${rescheduleAppt.patientName} · ${formatSlot(rescheduleAppt.startsAt)}`
                : ''}
            </Text>
            <Text variant="bodyMedium" style={[styles.dialogBody, styles.mt]}>
              Scheduling is not connected in this build. Use your practice
              management or calendar tool to move the visit — this dialog is UI
              only.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setRescheduleId(null)}
              disabled={complete.isPending}>
              Close
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <LoadingOverlay
        visible={complete.isPending}
        message="Updating appointment…"
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

function AppointmentCard({
  item,
  completing,
  apiBusy,
  onComplete,
  onReschedule,
}: {
  item: Appointment;
  completing: boolean;
  apiBusy: boolean;
  onComplete: () => void;
  onReschedule: () => void;
}) {
  const pending = item.status === 'pending';

  return (
    <Card style={[clinicScreen.card, styles.card]} mode="elevated">
      <Card.Content>
        <View style={styles.cardTop}>
          <View style={styles.cardMain}>
            <Text variant="titleMedium" style={styles.patient}>
              {item.patientName}
            </Text>
            <Text variant="bodyMedium" style={styles.doctor}>
              {item.doctorName}
            </Text>
            <Text variant="bodySmall" style={styles.time}>
              {formatSlot(item.startsAt)}
            </Text>
          </View>
          <Chip
            compact
            mode="flat"
            style={pending ? styles.chipPending : styles.chipDone}
            textStyle={
              pending ? styles.chipPendingText : styles.chipDoneText
            }>
            {pending ? 'Pending' : 'Completed'}
          </Chip>
        </View>
        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={onReschedule}
            disabled={apiBusy}
            style={[clinicScreen.buttonCompact, styles.actionBtn]}
            contentStyle={clinicScreen.buttonContentCompact}>
            Reschedule
          </Button>
          {pending ? (
            <Button
              mode="contained"
              onPress={onComplete}
              loading={completing}
              disabled={apiBusy}
              style={[clinicScreen.buttonCompact, styles.actionBtn]}
              contentStyle={clinicScreen.buttonContentCompact}>
              Mark completed
            </Button>
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
  scroll: {
    paddingTop: spacing.sm,
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
  doctor: {
    color: colors.text,
    marginTop: 4,
  },
  time: {
    color: colors.textMuted,
    marginTop: 6,
  },
  chipPending: {
    backgroundColor: colors.surfaceVariant,
    alignSelf: 'flex-start',
  },
  chipPendingText: {
    color: colors.secondaryElevated,
    fontWeight: '600',
  },
  chipDone: {
    backgroundColor: 'rgba(27, 122, 108, 0.14)',
    alignSelf: 'flex-start',
  },
  chipDoneText: {
    color: colors.success,
    fontWeight: '600',
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
  mt: {
    marginTop: 12,
  },
});
