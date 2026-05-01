import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_CLOSE_TIME,
  DEFAULT_OPEN_TIME,
  useAuthStore,
  useClinicSettingsStore,
  usePatientStore,
  useVisitHistoryStore,
} from '@/store';

const PERSIST_KEYS = [
  'clinic-app-auth',
  'clinic-app-patient',
  'clinic-app-settings',
  'clinic-app-visit-history',
] as const;

/**
 * Clears persisted Zustand slices and matching AsyncStorage keys, then resets
 * in-memory session, patient, and local clinic settings.
 */
export async function clearAllPersistedAppState(): Promise<void> {
  await AsyncStorage.multiRemove([...PERSIST_KEYS]);

  useAuthStore.getState().clearSession();
  usePatientStore.getState().clearActivePatient();
  useVisitHistoryStore.getState().clearHistory();
  useClinicSettingsStore.setState({
    openTime: DEFAULT_OPEN_TIME,
    closeTime: DEFAULT_CLOSE_TIME,
    isOpen: true,
  });
}
