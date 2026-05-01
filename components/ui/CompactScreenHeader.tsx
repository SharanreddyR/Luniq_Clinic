import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { clinicIcons, spacing } from '@/constants';
import { colors } from '@/constants/Colors';

type Props = {
  title: string;
  onBackPress?: () => void;
};

export function CompactScreenHeader({ title, onBackPress }: Props) {
  const goBack = onBackPress ?? (() => router.back());

  return (
    <LinearGradient
      colors={['#0B6B6D', '#1A9B98', '#40B9AE']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.wrap}>
      <View style={styles.inner}>
        <Pressable
          onPress={goBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={clinicIcons.size.md}
            color={colors.secondary}
          />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            Care workflow
          </Text>
        </View>
        <View style={styles.backSpacer} />
      </View>
    </LinearGradient>
  );
}

const BACK_W = 40;

const styles = StyleSheet.create({
  wrap: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: spacing.sm,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: -spacing.sm,
  },
  back: {
    width: BACK_W,
    height: BACK_W,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7EBE9',
  },
  backPressed: {
    opacity: 0.9,
    backgroundColor: '#EAF7F6',
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    lineHeight: 20,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.4,
    lineHeight: 16,
  },
  backSpacer: {
    width: BACK_W,
    marginLeft: spacing.xs,
  },
});
