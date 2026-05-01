import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';

import { clinicIcons, radii, shadows, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type IonName = ComponentProps<typeof Ionicons>['name'];

export type ClinicDashboardIcon =
  | { pack: 'material'; name: MciName }
  | { pack: 'ionicons'; name: IonName };

type Props = {
  title: string;
  subtitle: string;
  icon: ClinicDashboardIcon;
  onPress: () => void;
};

function DashboardGlyph({
  icon,
  size,
  color,
}: {
  icon: ClinicDashboardIcon;
  size: number;
  color: string;
}) {
  if (icon.pack === 'material') {
    return (
      <MaterialCommunityIcons name={icon.name} size={size} color={color} />
    );
  }
  return <Ionicons name={icon.name} size={size} color={color} />;
}

export function DashboardCard({ title, subtitle, icon, onPress }: Props) {
  const mainSize = clinicIcons.size.md;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={title}>
      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.content}>
          <LinearGradient
            colors={['#D2FAF4', '#F2FFFD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconWrap}>
            <DashboardGlyph
              icon={icon}
              size={mainSize}
              color={colors.secondaryElevated}
            />
          </LinearGradient>
          <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text variant="bodySmall" style={styles.subtitle} numberOfLines={3}>
            {subtitle}
          </Text>
        </Card.Content>
      </Card>
    </Pressable>
  );
}

const ICON_WRAP = 48;

const styles = StyleSheet.create({
  pressable: {
    flexGrow: 1,
    flexBasis: '47%',
    maxWidth: '48%',
    minWidth: 152,
  },
  pressed: {
    opacity: 0.88,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    minHeight: 168,
    borderWidth: 1.5,
    borderColor: 'rgba(10, 82, 87, 0.12)',
    ...shadows.card,
    shadowColor: '#0A5257',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  content: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  iconWrap: {
    width: ICON_WRAP,
    height: ICON_WRAP,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: clinicIcons.textGap,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34, 184, 174, 0.28)',
  },
  title: {
    ...typography.title,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: spacing.xs,
    color: colors.secondary,
    letterSpacing: -0.2,
  },
  subtitle: {
    ...typography.subtitle,
    flex: 1,
    color: colors.textMuted,
    lineHeight: 20,
    fontWeight: '500',
  },
});
