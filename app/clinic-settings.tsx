import { router } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  Card,
  HelperText,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompactScreenHeader } from '@/components/ui/CompactScreenHeader';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { useAppToast } from '@/hooks/useAppToast';
import { useSaveClinicTiming } from '@/hooks/useSaveClinicTiming';
import { useClinicSettingsStore } from '@/store';

function isValidHm(value: string): boolean {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return false;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h >= 0 && h <= 23 && min >= 0 && min <= 59;
}

function normalizeHm(value: string): string {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return value.trim();
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export default function ClinicSettingsScreen() {
  const openTime = useClinicSettingsStore((s) => s.openTime);
  const closeTime = useClinicSettingsStore((s) => s.closeTime);
  const isOpen = useClinicSettingsStore((s) => s.isOpen);
  const setOpenTime = useClinicSettingsStore((s) => s.setOpenTime);
  const setCloseTime = useClinicSettingsStore((s) => s.setCloseTime);
  const setIsOpen = useClinicSettingsStore((s) => s.setIsOpen);

  const saveTiming = useSaveClinicTiming();
  const { showSuccess, showError } = useAppToast();

  const openOk = isValidHm(openTime);
  const closeOk = isValidHm(closeTime);
  const canSave =
    openOk && closeOk && !saveTiming.isPending;

  function onSave() {
    if (!openOk || !closeOk) {
      showError('Use 24-hour times like 09:00 and 18:00.');
      return;
    }
    const payload = {
      openTime: normalizeHm(openTime),
      closeTime: normalizeHm(closeTime),
      isOpen,
    };
    setOpenTime(payload.openTime);
    setCloseTime(payload.closeTime);

    saveTiming.mutate(payload, {
      onSuccess: () => {
        showSuccess('Clinic timing saved locally and sent to the server.');
      },
      onError: (err) => {
        showError(
          err instanceof Error ? err.message : 'Could not reach the server',
        );
      },
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <CompactScreenHeader title="Clinic settings" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text variant="bodyMedium" style={styles.intro}>
            Hours and open/closed status are saved on this device and posted to
            POST /clinic-timing when you tap Save.
          </Text>

          <Card style={[clinicScreen.card, styles.card]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Hours
              </Text>
              <TextInput
                label="Open time"
                value={openTime}
                onChangeText={setOpenTime}
                mode="outlined"
                placeholder="09:00"
                keyboardType="numbers-and-punctuation"
                style={styles.input}
                disabled={saveTiming.isPending}
              />
              <HelperText type={openOk ? 'info' : 'error'} visible={!openOk}>
                Use HH:mm (24h), e.g. 09:00
              </HelperText>
              <TextInput
                label="Close time"
                value={closeTime}
                onChangeText={setCloseTime}
                mode="outlined"
                placeholder="18:00"
                keyboardType="numbers-and-punctuation"
                style={styles.input}
                disabled={saveTiming.isPending}
              />
              <HelperText type={closeOk ? 'info' : 'error'} visible={!closeOk}>
                Use HH:mm (24h), e.g. 18:00
              </HelperText>
            </Card.Content>
          </Card>

          <Card style={[clinicScreen.card, styles.card]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Status
              </Text>
              <Text variant="bodySmall" style={styles.muted}>
                Toggle whether the clinic is marked open or closed for patients.
              </Text>
              <View style={styles.toggleRow}>
                <View style={styles.toggleText}>
                  <Text variant="labelLarge" style={styles.toggleLabel}>
                    {isOpen ? 'Open' : 'Closed'}
                  </Text>
                  <Text variant="bodySmall" style={styles.toggleHint}>
                    {isOpen
                      ? 'Accepting visits during posted hours'
                      : 'Not accepting walk-ins'}
                  </Text>
                </View>
                <Switch
                  value={isOpen}
                  onValueChange={setIsOpen}
                  disabled={saveTiming.isPending}
                  color={colors.primary}
                />
              </View>
            </Card.Content>
          </Card>

          <Button
            mode="contained"
            onPress={onSave}
            loading={saveTiming.isPending}
            disabled={!canSave}
            style={[clinicScreen.button, styles.save]}
            contentStyle={clinicScreen.buttonContent}>
            Save clinic timing
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <LoadingOverlay
        visible={saveTiming.isPending}
        message="Saving clinic timing…"
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
  input: {
    marginBottom: 4,
    backgroundColor: colors.surface,
  },
  muted: {
    ...typography.subtitle,
    marginBottom: spacing.md,
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
  toggleLabel: {
    ...typography.title,
    fontSize: 16,
    fontWeight: '600',
  },
  toggleHint: {
    ...typography.small,
    marginTop: spacing.xs / 2,
  },
  save: {
    marginTop: spacing.md,
  },
});
