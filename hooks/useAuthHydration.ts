import { useEffect, useState } from 'react';

import { useAuthStore } from '@/store/authStore';

/** True after Zustand persist has rehydrated from AsyncStorage */
export function useAuthHydration(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    useAuthStore.persist.hasHydrated(),
  );

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    return unsub;
  }, []);

  return hydrated;
}
