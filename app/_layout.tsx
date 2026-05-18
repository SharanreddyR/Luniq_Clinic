import '../registerFirebaseMessagingBackground';

import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AppBootScreen } from '@/components/auth/AppBootScreen';
import { AppProviders } from '@/components/providers/AppProviders';
import { colors } from '@/constants/Colors';
import { isRunningInExpoGo } from 'expo';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

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
    if (Platform.OS === 'web' || isRunningInExpoGo()) return;
    let cancelled = false;
    void (async () => {
      try {
        const Notifications = await import('expo-notifications');
        if (cancelled) return;
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
      } catch {
        /* dev client / missing native module */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return <AppBootScreen />;
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
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="clinic-settings" />
        <Stack.Screen name="clinic-timings" />
        <Stack.Screen name="clinic-services" />
        <Stack.Screen name="appointments" />
        <Stack.Screen name="patient-intake" />
        <Stack.Screen name="view-patients" />
        <Stack.Screen name="patient-intake-visit" />
        <Stack.Screen name="patient-lookup" />
        <Stack.Screen name="patient-scan" />
        <Stack.Screen name="patient-verification" />
        <Stack.Screen name="patient-visit-details" />
        <Stack.Screen name="opd" />
        <Stack.Screen name="upload" />
        <Stack.Screen name="claim" />
        <Stack.Screen name="claim-status" />
        <Stack.Screen name="claim-detail" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="doctor-availability" />
      </Stack>
    </AppProviders>
  );
}
