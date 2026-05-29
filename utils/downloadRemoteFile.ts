import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const DOWNLOAD_DIR = 'visit_history_downloads/';

function safeFileName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').trim().slice(0, 120) || 'document';
}

function extensionFromNameOrUrl(fileName: string, url: string): string {
  const fromName = fileName.match(/\.[a-zA-Z0-9]{1,8}$/i);
  if (fromName) return fromName[0];
  try {
    const path = new URL(url).pathname;
    const fromUrl = path.match(/\.[a-zA-Z0-9]{1,8}$/i);
    if (fromUrl) return fromUrl[0];
  } catch {
    /* ignore */
  }
  return '.pdf';
}

function mimeForFileName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

/**
 * Downloads a remote file (e.g. presigned R2 URL) then opens the system share
 * sheet so the user can save to Files / Downloads.
 */
export async function downloadRemoteFile(
  url: string,
  displayName: string,
): Promise<void> {
  const trimmedUrl = String(url ?? '').trim();
  if (!trimmedUrl) {
    throw new Error('Missing download URL.');
  }

  const safeBase = safeFileName(displayName);
  const ext = extensionFromNameOrUrl(safeBase, trimmedUrl);
  const fileName = /\.[a-zA-Z0-9]{1,8}$/i.test(safeBase)
    ? safeBase
    : `${safeBase}${ext}`;

  if (Platform.OS === 'web') {
    const res = await fetch(trimmedUrl);
    if (!res.ok) {
      throw new Error(`Download failed (${res.status}).`);
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    return;
  }

  const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!base) {
    throw new Error('File storage is not available on this device.');
  }

  const dir = `${base}${DOWNLOAD_DIR}`;
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    /* directory may already exist */
  }

  const localUri = `${dir}${Date.now()}-${fileName}`;
  const result = await FileSystem.downloadAsync(trimmedUrl, localUri);
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Download failed (${result.status}).`);
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Saving files is not supported on this device.');
  }

  const mime = mimeForFileName(fileName);
  const isPdf = mime === 'application/pdf';

  await Sharing.shareAsync(result.uri, {
    mimeType: mime,
    dialogTitle: 'Save document',
    ...(Platform.OS === 'ios' && isPdf ? { UTI: 'com.adobe.pdf' } : {}),
  });
}
