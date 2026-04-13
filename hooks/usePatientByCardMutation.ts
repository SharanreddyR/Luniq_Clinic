import { useMutation } from '@tanstack/react-query';

import { fetchPatientByCardNumber } from '@/services/patientService';

export function usePatientByCardMutation() {
  return useMutation({
    mutationFn: (cardNumber: string) => fetchPatientByCardNumber(cardNumber),
  });
}
