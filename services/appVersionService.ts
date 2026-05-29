import { Platform } from 'react-native';
import * as Application from 'expo-application';

import { API_BASE_URL } from '@/constants/config';
import { api } from '@/services/http';
import {
  isOnLatestVersion,
  isVersionLessThan,
  normalizeVersionLabel,
} from '@/utils/semver';

const ANDROID_PACKAGE = 'com.luniqhealth.luniqclinic';

const DEFAULT_PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

export type ClinicAndroidVersionConfig = {
  minVersion: string;
  latestVersion: string;
  storeUrl: string;
  updateMessage: string;
};

export type AppUpdateCheckResult = {
  currentVersion: string;
  latestVersion: string;
  minVersion: string;
  storeUrl: string;
  message: string;
  /** User should see the update dialog */
  updateRequired: boolean;
  /** Dialog cannot be dismissed (below min_version) */
  forceUpdate: boolean;
};

type ConfigEnvelope = {
  success?: boolean;
  data?: {
    app_versions?: {
      clinic?: {
        android?: {
          min_version?: string;
          latest_version?: string;
          store_url?: string;
          update_message?: string;
        };
      };
    };
  };
};

export function getInstalledAppVersion(): string {
  const raw = Application.nativeApplicationVersion?.trim() || '0.0.0';
  return normalizeVersionLabel(raw);
}

export async function fetchClinicAndroidVersionConfig(): Promise<ClinicAndroidVersionConfig> {
  const { data } = await api.get<ConfigEnvelope>('/config', {
    params: { _: Date.now() },
    headers: { 'Cache-Control': 'no-cache' },
  });
  const android = data?.data?.app_versions?.clinic?.android;
  return {
    minVersion: normalizeVersionLabel(
      String(android?.min_version ?? '0.0.0').trim() || '0.0.0',
    ),
    latestVersion: normalizeVersionLabel(
      String(android?.latest_version ?? '0.0.0').trim() || '0.0.0',
    ),
    storeUrl: String(android?.store_url ?? DEFAULT_PLAY_STORE_URL).trim() || DEFAULT_PLAY_STORE_URL,
    updateMessage:
      String(android?.update_message ?? '').trim() ||
      'A new version of Luniq Clinic is available. Please update to continue.',
  };
}

export function evaluateAppUpdate(
  currentVersion: string,
  config: ClinicAndroidVersionConfig,
): AppUpdateCheckResult {
  const current = normalizeVersionLabel(currentVersion);
  const minVersion = normalizeVersionLabel(config.minVersion);
  const latestVersion = normalizeVersionLabel(config.latestVersion);

  const upToDate = isOnLatestVersion(current, latestVersion);
  const belowMin = !upToDate && isVersionLessThan(current, minVersion);
  const belowLatest = !upToDate && isVersionLessThan(current, latestVersion);

  return {
    currentVersion: current,
    latestVersion,
    minVersion,
    storeUrl: config.storeUrl,
    message: config.updateMessage,
    updateRequired: belowLatest,
    forceUpdate: belowMin,
  };
}

export async function checkClinicAppUpdate(): Promise<AppUpdateCheckResult | null> {
  if (Platform.OS !== 'android') {
    return null;
  }
  if (String(process.env.EXPO_PUBLIC_SKIP_VERSION_CHECK ?? '').trim() === '1') {
    return null;
  }

  const currentVersion = getInstalledAppVersion();
  const config = await fetchClinicAndroidVersionConfig();
  const result = evaluateAppUpdate(currentVersion, config);

  // Same or newer than Play latest — never show the update dialog.
  if (
    !result.updateRequired ||
    isOnLatestVersion(result.currentVersion, result.latestVersion)
  ) {
    return null;
  }
  return result;
}

/** Open Play Store listing (HTTPS or market://). */
export async function openClinicPlayStore(storeUrl?: string): Promise<void> {
  const { Linking } = await import('react-native');
  const httpsUrl = (storeUrl?.trim() || DEFAULT_PLAY_STORE_URL).trim();
  const marketUrl = `market://details?id=${ANDROID_PACKAGE}`;

  try {
    const canMarket = await Linking.canOpenURL(marketUrl);
    if (canMarket) {
      await Linking.openURL(marketUrl);
      return;
    }
  } catch {
    /* fall through */
  }

  await Linking.openURL(httpsUrl);
}

export function appConfigEndpointForDebug(): string {
  return `${API_BASE_URL.replace(/\/+$/, '')}/config`;
}
