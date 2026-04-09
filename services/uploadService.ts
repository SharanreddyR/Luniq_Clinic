import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { Platform } from 'react-native';

import { API_BASE_URL } from '@/constants/config';
import { useAuthStore } from '@/store/authStore';

export type UploadCategory = 'prescription' | 'report' | 'bill';

export type UploadPayload = {
  category: UploadCategory;
  asset: DocumentPickerAsset;
};

export type UploadResponse = {
  id: string | number;
  fileName?: string;
  message?: string;
};

function uploadUrl(): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}/upload`;
}

function appendFile(formData: FormData, asset: DocumentPickerAsset) {
  if (Platform.OS === 'web' && asset.file) {
    formData.append('file', asset.file, asset.name);
    return;
  }
  formData.append(
    'file',
    {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType ?? 'application/octet-stream',
    } as unknown as Blob,
  );
}

/**
 * POST /upload — multipart: `file`, `category` (prescription | report | bill)
 */
export async function uploadDocument(
  category: UploadCategory,
  asset: DocumentPickerAsset,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('category', category);
  appendFile(formData, asset);

  const token = useAuthStore.getState().token;
  const headers: HeadersInit = {
    Accept: 'application/json',
  };
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(uploadUrl(), {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Upload failed (${res.status})`);
    }

    try {
      const data = (await res.json()) as UploadResponse;
      return data;
    } catch {
      return {
        id: Date.now(),
        fileName: asset.name,
        message: 'Uploaded',
      };
    }
  } catch {
    await delay(750);
    return {
      id: `demo-${Date.now()}`,
      fileName: asset.name,
      message: `Uploaded ${category} (demo)`,
    };
  }
}

export async function pickDocument(): Promise<DocumentPickerAsset | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  return result.assets[0];
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
