import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { APP_NAME } from '@/constants/config';
import { colors } from '@/constants/Colors';

type Props = {
  compact?: boolean;
  /** White text / inverted chip for teal splash background */
  variant?: 'default' | 'onPrimary';
};

export function ClinicLogo({ compact, variant = 'default' }: Props) {
  const onPrimary = variant === 'onPrimary';

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View
        style={[
          styles.iconCircle,
          onPrimary && styles.iconCircleOnPrimary,
        ]}>
        <MaterialCommunityIcons
          name="hospital-building"
          size={compact ? 36 : 48}
          color={onPrimary ? colors.primary : colors.onPrimary}
        />
      </View>
      {!compact && (
        <Text
          variant="headlineMedium"
          style={[styles.title, onPrimary && styles.titleOnPrimary]}>
          {APP_NAME}
        </Text>
      )}
      {!compact && (
        <Text
          variant="bodyMedium"
          style={[styles.subtitle, onPrimary && styles.subtitleOnPrimary]}>
          Your health, organized
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  wrapCompact: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  iconCircleOnPrimary: {
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.secondary,
    fontWeight: '700',
  },
  titleOnPrimary: {
    color: colors.onPrimary,
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: 4,
  },
  subtitleOnPrimary: {
    color: colors.onPrimary,
    opacity: 0.9,
  },
});
