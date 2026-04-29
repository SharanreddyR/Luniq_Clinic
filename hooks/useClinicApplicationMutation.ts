import type { DocumentPickerAsset } from 'expo-document-picker';
import { useMutation } from '@tanstack/react-query';

import {
  type ClinicApplicationFormFields,
  submitApplicationWithOptionalDocument,
} from '@/services/clinicApplicationService';

export type ClinicApplicationMutationPayload = {
  fields: ClinicApplicationFormFields;
  licenseAsset: DocumentPickerAsset | null;
};

export function useClinicApplicationMutation() {
  return useMutation({
    mutationFn: (payload: ClinicApplicationMutationPayload) =>
      submitApplicationWithOptionalDocument(
        payload.fields,
        payload.licenseAsset,
      ),
  });
}
