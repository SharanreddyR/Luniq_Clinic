import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import {
  Appbar,
  Card,
  Divider,
  Switch,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { useAppToast } from '@/hooks/useAppToast';
import { useDoctors } from '@/hooks/useDoctors';
import { useUpdateDoctorAvailability } from '@/hooks/useUpdateDoctorAvailability';
import type { Doctor } from '@/services/doctorService';

export default function DoctorAvailabilityScreen() {
  const doctorsQuery = useDoctors();
  const updateAvailability = useUpdateDoctorAvailability();
  const { showError, showSuccess } = useAppToast();
  const listErrorToastShown = useRef(false);

  const list = doctorsQuery.data ?? [];

  useEffect(() => {
    if (doctorsQuery.isError && !listErrorToastShown.current) {
      listErrorToastShown.current = true;
      showError('Could not load doctors. Pull down to retry.');
    }
    if (!doctorsQuery.isError) {
      listErrorToastShown.current = false;
    }
  }, [doctorsQuery.isError, showError]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Appbar.Header mode="center-aligned" style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title="Doctor availability"
          titleStyle={clinicScreen.headerTitle}
        />
      </Appbar.Header>

      <Text variant="bodyMedium" style={styles.intro}>
        Roster from GET /doctors. Toggle updates POST /update-availability. Pull
        down to refresh.
      </Text>

      {doctorsQuery.isPending && !doctorsQuery.data ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading doctors…
          </Text>
        </View>
      ) : doctorsQuery.isError ? (
        <View style={styles.centered}>
          <Text variant="bodyLarge" style={styles.errorText}>
            Could not load doctors
          </Text>
          <Text variant="bodyMedium" style={styles.muted}>
            Pull down to try again.
          </Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={doctorsQuery.isFetching && !doctorsQuery.isPending}
              onRefresh={() => void doctorsQuery.refetch()}
              tintColor={colors.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => (
            <DoctorRow
              doctor={item}
              busy={
                updateAvailability.isPending &&
                updateAvailability.variables?.doctorId === item.id
              }
              disableAll={updateAvailability.isPending}
              onToggle={(available) => {
                updateAvailability.mutate(
                  { doctorId: item.id, available },
                  {
                    onSuccess: () => {
                      showSuccess(
                        available
                          ? 'Doctor marked available'
                          : 'Doctor marked unavailable',
                      );
                    },
                    onError: (err) => {
                      showError(
                        err instanceof Error
                          ? err.message
                          : 'Could not update availability',
                      );
                    },
                  },
                );
              }}
            />
          )}
          ListEmptyComponent={
            <Text variant="bodyMedium" style={styles.empty}>
              No doctors returned.
            </Text>
          }
        />
      )}

      <LoadingOverlay
        visible={updateAvailability.isPending}
        message="Updating availability…"
      />
    </SafeAreaView>
  );
}

function DoctorRow({
  doctor,
  busy,
  disableAll,
  onToggle,
}: {
  doctor: Doctor;
  busy: boolean;
  disableAll: boolean;
  onToggle: (available: boolean) => void;
}) {
  return (
    <Card mode="elevated" style={[clinicScreen.card, styles.card]}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.name}>
          {doctor.name}
        </Text>
        <Text variant="bodyMedium" style={styles.department}>
          {doctor.department}
        </Text>

        <View style={styles.slotsBlock}>
          <Text variant="labelSmall" style={styles.slotsLabel}>
            Time slots
          </Text>
          <Text variant="bodyMedium" style={styles.slotsValue}>
            {doctor.timing}
          </Text>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text variant="labelLarge" style={styles.toggleTitle}>
              Availability
            </Text>
            <Text variant="bodySmall" style={styles.toggleState}>
              {doctor.available ? 'Available' : 'Not available'}
            </Text>
          </View>
          <Switch
            value={doctor.available}
            onValueChange={onToggle}
            disabled={busy || disableAll}
            color={colors.primary}
          />
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
  header: {
    backgroundColor: colors.surface,
    elevation: 0,
  },
  intro: {
    ...typography.subtitle,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  sep: {
    height: spacing.md,
  },
  card: {},
  name: {
    ...typography.title,
  },
  department: {
    ...typography.subtitle,
    marginTop: spacing.xs,
  },
  slotsBlock: {
    marginTop: spacing.md,
  },
  slotsLabel: {
    ...typography.small,
    marginBottom: 2,
  },
  slotsValue: {
    ...typography.subtitle,
  },
  divider: {
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleText: {
    flex: 1,
    paddingRight: spacing.md,
  },
  toggleTitle: {
    color: colors.secondary,
    fontWeight: '600',
    fontSize: typography.subtitle.fontSize,
    lineHeight: typography.subtitle.lineHeight,
  },
  toggleState: {
    ...typography.small,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    ...typography.subtitle,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.title,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  muted: {
    ...typography.subtitle,
    textAlign: 'center',
  },
  empty: {
    ...typography.subtitle,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
