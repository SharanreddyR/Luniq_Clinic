import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { radii, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';

type Props = {
  visible: boolean;
  message?: string;
};

/**
 * Blocks interaction while an API call is in flight (clinic staff feedback).
 */
export function LoadingOverlay({ visible, message }: Props) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={() => {}}>
      <View style={styles.backdrop} pointerEvents="auto">
        <View style={styles.card}>
          <ActivityIndicator size="large" color={colors.primary} />
          {message ? (
            <Text style={styles.message}>{message}</Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 45, 47, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg + spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg + spacing.md,
    paddingHorizontal: spacing.xl + spacing.sm,
    alignItems: 'center',
    maxWidth: 320,
    gap: spacing.lg,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  message: {
    ...typography.subtitle,
    color: colors.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
