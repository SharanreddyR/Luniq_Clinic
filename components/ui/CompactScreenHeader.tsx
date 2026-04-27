import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { clinicIcons, spacing } from '@/constants';
import { colors } from '@/constants/Colors';

type Props = {
  title: string;
  onBackPress?: () => void;
};

/**
 * Slim in-screen header (~44pt) — replaces tall Material Appbar on inner routes.
 */
export function CompactScreenHeader({ title, onBackPress }: Props) {
  const goBack = onBackPress ?? (() => router.back());

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={goBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [styles.back, pressed && styles.backPressed]}>
        <MaterialCommunityIcons
          name="arrow-left"
          size={clinicIcons.size.md}
          color={colors.text}
        />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.backSpacer} />
    </View>
  );
}

const BACK_W = 40;

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    marginHorizontal: -spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  back: {
    width: BACK_W,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
    borderRadius: 10,
  },
  backPressed: {
    opacity: 0.65,
    backgroundColor: colors.surfaceVariant,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  backSpacer: {
    width: BACK_W,
    marginLeft: spacing.xs,
  },
});
