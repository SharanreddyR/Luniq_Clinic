import { useCallback } from 'react';

import { useToastContext } from '@/components/providers/ToastProvider';

/**
 * Global snackbar toasts (success / error / info). Renders from {@link ToastProvider}
 * so messages still show after navigation (e.g. login → home).
 */
export function useAppToast() {
  const { showSuccess, showError, showInfo, hideToast } = useToastContext();

  const AppToast = useCallback(() => null, []);

  return {
    showSuccess,
    showError,
    showInfo,
    hideToast,
    AppToast,
  };
}
