import { Redirect } from 'expo-router';

import { useAuthHydration } from '@/hooks/useAuthHydration';
import { useAuthStore } from '@/store';

/** Entry: send users straight to login or home once persisted auth is ready. */
export default function Index() {
  const hydrated = useAuthHydration();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!hydrated) {
    return null;
  }

  return <Redirect href={isAuthenticated ? '/home' : '/login'} />;
}
