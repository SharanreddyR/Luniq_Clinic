import { useMutation } from '@tanstack/react-query';

import {
  type UploadPayload,
  uploadDocument,
} from '@/services/uploadService';

export function useUploadDocument() {
  return useMutation({
    mutationFn: ({ category, asset }: UploadPayload) =>
      uploadDocument(category, asset),
  });
}
