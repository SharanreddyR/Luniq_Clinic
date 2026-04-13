import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';

type ToastType = 'success' | 'error' | 'info';

export type ToastContextValue = {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  const hideToast = useCallback(() => setToast(null), []);

  const showSuccess = useCallback((message: string) => {
    setToast({ message, type: 'success' });
  }, []);

  const showError = useCallback((message: string) => {
    setToast({ message, type: 'error' });
  }, []);

  const showInfo = useCallback((message: string) => {
    setToast({ message, type: 'info' });
  }, []);

  const value = useMemo(
    () => ({ showSuccess, showError, showInfo, hideToast }),
    [showSuccess, showError, showInfo, hideToast],
  );

  const bg =
    toast?.type === 'error'
      ? colors.error
      : toast?.type === 'success'
        ? colors.success
        : colors.secondaryElevated;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        style={[styles.host, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Snackbar
          visible={toast != null}
          onDismiss={hideToast}
          duration={toast?.type === 'error' ? 5500 : 4000}
          style={[styles.snack, toast != null ? { backgroundColor: bg } : null]}
          elevation={5}>
          <RNText style={styles.snackText}>{toast?.message ?? ''}</RNText>
        </Snackbar>
      </View>
    </ToastContext.Provider>
  );
}

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (ctx == null) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 50_000,
    elevation: 50,
  },
  snack: {
    marginHorizontal: 16,
    marginBottom: 4,
  },
  snackText: {
    color: colors.onPrimary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
});
