import { router } from 'expo-router';
import { useState } from 'react';
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
  Snackbar,
  Switch,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { useDoctors } from '@/hooks/useDoctors';
import { useUpdateDoctorAvailability } from '@/hooks/useUpdateDoctorAvailability';
import type { Doctor } from '@/services/doctorService';

export default function DoctorManagementScreen() {
  const [snack, setSnack] = useState('');
  const doctorsQuery = useDoctors();
  const updateAvailability = useUpdateDoctorAvailability();

  const list = doctorsQuery.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Appbar.Header mode="center-aligned" style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title="Doctor management"
          titleStyle={styles.headerTitle}
        />
      </Appbar.Header>

      <Text variant="bodyMedium" style={styles.intro}>
        Review schedules, turn availability on or off, and pull to refresh the
        roster.
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
              onToggle={(available) => {
                updateAvailability.mutate(
                  { doctorId: item.id, available },
                  {
                    onError: (err) => {
                      setSnack(
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

      <Snackbar
        visible={snack.length > 0}
        onDismiss={() => setSnack('')}
        duration={3500}
        style={styles.snack}>
        {snack}
      </Snackbar>
    </SafeAreaView>
  );
}

function DoctorRow({
  doctor,
  busy,
  onToggle,
}: {
  doctor: Doctor;
  busy: boolean;
  onToggle: (available: boolean) => void;
}) {
  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Content>
        <View style={styles.rowTop}>
          <View style={styles.nameBlock}>
            <Text variant="titleMedium" style={styles.name}>
              {doctor.name}
            </Text>
            <View style={styles.timingRow}>
              <Text variant="labelSmall" style={styles.timingLabel}>
                Timing
              </Text>
              <Text variant="bodyMedium" style={styles.timing}>
                {doctor.timing}
              </Text>
            </View>
          </View>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.rowBottom}>
          <View>
            <Text variant="labelLarge" style={styles.availLabel}>
              Available
            </Text>
            <Text variant="bodySmall" style={styles.availHint}>
              {doctor.available ? 'Accepting patients' : 'Not accepting now'}
            </Text>
          </View>
          <Switch
            value={doctor.available}
            onValueChange={onToggle}
            disabled={busy}
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
  headerTitle: {
    color: colors.secondary,
    fontWeight: '600',
  },
  intro: {
    color: colors.textMuted,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    lineHeight: 22,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sep: {
    height: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  rowTop: {
    marginBottom: 8,
  },
  nameBlock: {
    gap: 6,
  },
  name: {
    color: colors.secondary,
    fontWeight: '700',
  },
  timingRow: {
    marginTop: 4,
  },
  timingLabel: {
    color: colors.textMuted,
    marginBottom: 2,
  },
  timing: {
    color: colors.text,
    lineHeight: 22,
  },
  divider: {
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availLabel: {
    color: colors.secondary,
    fontWeight: '600',
  },
  availHint: {
    color: colors.textMuted,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    color: colors.textMuted,
    marginTop: 12,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    marginBottom: 8,
  },
  muted: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  snack: {
    marginBottom: 24,
  },
});
