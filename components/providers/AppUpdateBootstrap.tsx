import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { AppUpdateModal } from '@/components/AppUpdateModal';
import {
  checkClinicAppUpdate,
  type AppUpdateCheckResult,
} from '@/services/appVersionService';

const LATER_DISMISS_MS = 4 * 60 * 60 * 1000;

/**
 * On app open / resume, compares installed version with GET /config app_versions.
 * Shows update dialog only when installed version is strictly older than latest.
 */
export function AppUpdateBootstrap() {
  const [update, setUpdate] = useState<AppUpdateCheckResult | null>(null);
  const [visible, setVisible] = useState(false);
  const dismissedUntilRef = useRef(0);
  const dismissedForLatestRef = useRef<string | null>(null);
  const checkingRef = useRef(false);

  const clearUpdateUi = useCallback(() => {
    dismissedUntilRef.current = 0;
    dismissedForLatestRef.current = null;
    setUpdate(null);
    setVisible(false);
  }, []);

  const runCheck = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    if (checkingRef.current) return;

    checkingRef.current = true;
    try {
      const result = await checkClinicAppUpdate();

      if (!result) {
        clearUpdateUi();
        return;
      }

      if (
        dismissedForLatestRef.current != null &&
        dismissedForLatestRef.current !== result.latestVersion
      ) {
        dismissedUntilRef.current = 0;
        dismissedForLatestRef.current = null;
      }

      const snoozed =
        !result.forceUpdate &&
        dismissedForLatestRef.current === result.latestVersion &&
        Date.now() < dismissedUntilRef.current;

      setUpdate(result);
      setVisible(!snoozed);
    } catch {
      /* offline / config unavailable — do not block the app */
    } finally {
      checkingRef.current = false;
    }
  }, [clearUpdateUi]);

  useEffect(() => {
    const t = setTimeout(() => {
      void runCheck();
    }, 800);
    return () => clearTimeout(t);
  }, [runCheck]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        void runCheck();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [runCheck]);

  const onDismissLater = useCallback(() => {
    if (!update) return;
    dismissedForLatestRef.current = update.latestVersion;
    dismissedUntilRef.current = Date.now() + LATER_DISMISS_MS;
    setVisible(false);
  }, [update]);

  if (!update || !visible) {
    return null;
  }

  return (
    <AppUpdateModal
      visible={visible}
      update={update}
      onDismissLater={update.forceUpdate ? undefined : onDismissLater}
    />
  );
}
