import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useState } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { clinicPaperTheme } from '@/constants';
import { AppUpdateBootstrap } from '@/components/providers/AppUpdateBootstrap';
import { NotificationInboxListener } from '@/components/providers/NotificationInboxListener';
import { PushNotificationBootstrap } from '@/components/providers/PushNotificationBootstrap';
import { ToastProvider } from '@/components/providers/ToastProvider';

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 60_000,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <PaperProvider theme={clinicPaperTheme}>
          <ToastProvider>
            <AppUpdateBootstrap />
            <NotificationInboxListener />
            <PushNotificationBootstrap />
            {children}
          </ToastProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
