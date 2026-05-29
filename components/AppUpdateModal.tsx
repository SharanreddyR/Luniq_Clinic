import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { radii, spacing } from '@/constants';
import { colors } from '@/constants/Colors';
import type { AppUpdateCheckResult } from '@/services/appVersionService';
import { openClinicPlayStore } from '@/services/appVersionService';

type Props = {
  visible: boolean;
  update: AppUpdateCheckResult;
  onDismissLater?: () => void;
};

export function AppUpdateModal({ visible, update, onDismissLater }: Props) {
  const canDismiss = !update.forceUpdate && Boolean(onDismissLater);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (canDismiss) onDismissLater?.();
      }}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons
              name="cellphone-arrow-down"
              size={36}
              color={colors.secondary}
            />
          </View>
          <Text variant="titleMedium" style={styles.title}>
            Update available
          </Text>
          <Text variant="bodyMedium" style={styles.message}>
            {update.message}
          </Text>
          <Text variant="bodySmall" style={styles.versionLine}>
            Your version: {update.currentVersion} · Latest: {update.latestVersion}
          </Text>
          <Button
            mode="contained"
            onPress={() => void openClinicPlayStore(update.storeUrl)}
            buttonColor={colors.secondary}
            textColor={colors.onPrimary}
            style={styles.updateBtn}
            contentStyle={styles.updateBtnContent}>
            Update on Play Store
          </Button>
          {canDismiss ? (
            <Button
              mode="text"
              onPress={onDismissLater}
              textColor={colors.textMuted}
              style={styles.laterBtn}>
              Later
            </Button>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 82, 87, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0A5257',
        shadowOpacity: 0.2,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 8 },
    }),
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#E8F8F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: '800',
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    color: colors.secondaryElevated,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  versionLine: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  updateBtn: {
    alignSelf: 'stretch',
    borderRadius: radii.button,
  },
  updateBtnContent: {
    minHeight: 48,
  },
  laterBtn: {
    marginTop: spacing.xs,
  },
});
