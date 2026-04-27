import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AppProviders } from '@/components/providers/AppProviders';
import { colors } from '@/constants/Colors';

import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...MaterialCommunityIcons.font,
    ...Ionicons.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="clinic-settings" />
        <Stack.Screen name="appointments" />
        <Stack.Screen name="patient-intake" />
        <Stack.Screen name="patient-intake-visit" />
        <Stack.Screen name="patient-lookup" />
        <Stack.Screen name="patient-scan" />
        <Stack.Screen name="patient-verification" />
        <Stack.Screen name="patient-visit-details" />
        <Stack.Screen name="opd" />
        <Stack.Screen name="upload" />
        <Stack.Screen name="claim" />
        <Stack.Screen name="claim-status" />
        <Stack.Screen name="doctor-availability" />
      </Stack>
    </AppProviders>
  );
}
