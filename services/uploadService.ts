import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { Platform } from 'react-native';

import { API_BASE_URL } from '@/constants/config';
import { useAuthStore } from '@/store';

export type UploadCategory = 'prescription' | 'report' | 'bill';

export type UploadPayload = {
  category: UploadCategory;
  asset: DocumentPickerAsset;
};

export type UploadResponse = {
  id: string | number;
  fileName?: string;
  message?: string;
  status?: string;
};

/** Row kept in screen state after a successful POST /upload. */
export type UploadedFilePreview = {
  localId: string;
  category: UploadCategory;
  name: string;
  size: number | null;
  mimeType: string | null;
  uri: string;
  uploadedAt: string;
  serverId: string | number;
  message?: string;
};

function uploadUrl(): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}/upload`;
}

/** Append a picked document under a custom field name (e.g. claim multipart). */
export function appendPickerAssetToFormData(
  formData: FormData,
  fieldName: string,
  asset: DocumentPickerAsset,
) {
  if (Platform.OS === 'web' && asset.file) {
    formData.append(fieldName, asset.file, asset.name);
    return;
  }
  formData.append(
    fieldName,
    {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType ?? 'application/octet-stream',
    } as unknown as Blob,
  );
}

function appendFile(formData: FormData, asset: DocumentPickerAsset) {
  appendPickerAssetToFormData(formData, 'file', asset);
}

/**
 * POST /upload — multipart: `file`, `category` (prescription | report | bill).
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

  const res = await fetch(uploadUrl(), {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }
  const data = (await res.json()) as UploadResponse;
  return {
    ...data,
    fileName: data.fileName ?? asset.name,
    status: data.status ?? 'uploaded',
  };
}

export function buildPreviewRecord(
  category: UploadCategory,
  asset: DocumentPickerAsset,
  response: UploadResponse,
): UploadedFilePreview {
  return {
    localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    category,
    name: asset.name ?? 'Document',
    size: asset.size ?? null,
    mimeType: asset.mimeType ?? null,
    uri: asset.uri,
    uploadedAt: new Date().toISOString(),
    serverId: response.id,
    message: response.message,
  };
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

