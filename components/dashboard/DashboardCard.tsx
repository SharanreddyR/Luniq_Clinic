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
  const chevronSize = clinicIcons.size.sm;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={title}>
      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.content}>
          <LinearGradient
            colors={['rgba(46, 189, 180, 0.22)', colors.surfaceVariant]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconWrap}>
            <DashboardGlyph
              icon={icon}
              size={mainSize}
              color={clinicIcons.color.primary}
            />
          </LinearGradient>
          <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text variant="bodySmall" style={styles.subtitle} numberOfLines={3}>
            {subtitle}
          </Text>
          <View style={styles.footer}>
            <MaterialCommunityIcons
              name="chevron-right"
              size={chevronSize}
              color={clinicIcons.color.secondary}
            />
          </View>
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
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    minHeight: 172,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  content: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  iconWrap: {
    width: ICON_WRAP,
    height: ICON_WRAP,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: clinicIcons.textGap,
    overflow: 'hidden',
  },
  title: {
    ...typography.title,
    fontSize: 17,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.subtitle,
    flex: 1,
  },
  footer: {
    alignItems: 'flex-end',
    marginTop: spacing.xs,
  },
});
