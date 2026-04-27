import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompactScreenHeader } from '@/components/ui/CompactScreenHeader';
import { clinicScreen, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { usePatientStore } from '@/store';

const BARCODE_TYPES = [
  'qr',
  'code128',
  'code39',
  'ean13',
  'ean8',
  'pdf417',
  'datamatrix',
] as const;

export default function PatientScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const setPendingCardInput = usePatientStore((s) => s.setPendingCardInput);
  const scannedOnce = useRef(false);

  const onBarcodeScanned = useCallback(
    (event: { data: string }) => {
      const data = event.data?.trim();
      if (scannedOnce.current || !data) return;
      scannedOnce.current = true;
      setPendingCardInput(data);
      router.back();
    },
    [setPendingCardInput],
  );

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <CompactScreenHeader title="Scan card" />
        <View style={styles.center}>
          <Text variant="bodyLarge" style={styles.muted}>
            Barcode scanning runs on the mobile app. On web, enter the card
            number on the previous screen.
          </Text>
          <Button
            mode="contained"
            onPress={() => router.back()}
            style={clinicScreen.button}
            contentStyle={clinicScreen.buttonContent}>
            Go back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <CompactScreenHeader title="Scan card" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <CompactScreenHeader title="Scan card" />
        <View style={styles.center}>
          <Text variant="bodyLarge" style={styles.muted}>
            Camera access is needed to scan the patient card barcode or QR code.
          </Text>
          <Button
            mode="contained"
            onPress={() => void requestPermission()}
            style={clinicScreen.button}
            contentStyle={clinicScreen.buttonContent}>
            Allow camera
          </Button>
          <Button mode="text" onPress={() => router.back()}>
            Cancel
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <CompactScreenHeader title="Scan card" />
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: [...BARCODE_TYPES],
          }}
          onBarcodeScanned={onBarcodeScanned}
        />
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.frame} />
          <Text variant="titleMedium" style={styles.overlayTitle}>
            Align the code in the frame
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Button mode="outlined" onPress={() => router.back()}>
          Enter card manually
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  cameraWrap: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.secondary,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: '72%',
    aspectRatio: 1,
    maxHeight: 280,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  overlayTitle: {
    marginTop: spacing.lg,
    color: colors.onPrimary,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  center: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  muted: {
    ...typography.subtitle,
    textAlign: 'center',
  },
});
