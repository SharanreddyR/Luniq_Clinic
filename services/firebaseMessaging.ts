/** Web: Firebase Cloud Messaging is not used. */
export async function requestFcmPermission(): Promise<boolean> {
  return false;
}

export async function getFirebaseFcmTokenOrNull(): Promise<string | null> {
  return null;
}

export function subscribeFirebaseTokenRefresh(_cb: (token: string) => void): () => void {
  return () => {};
}

export function subscribeFirebaseForeground(
  _cb: (data: Record<string, string>) => void,
): () => void {
  return () => {};
}

export function subscribeFirebaseNotificationOpened(
  _cb: (data: Record<string, string>) => void,
): () => void {
  return () => {};
}

export async function getFirebaseInitialMessageData(): Promise<Record<
  string,
  string
> | null> {
  return null;
}
