import { Stack } from 'expo-router';

import { colors } from '@/constants/Colors';

export default function ReportsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
