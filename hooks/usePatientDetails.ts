import { useQuery } from '@tanstack/react-query';

import { fetchPatientByCardNumber } from '@/services/patientService';

export function usePatientDetails(cardNumber: string | null) {
  return useQuery({
    queryKey: ['patient', cardNumber],
    queryFn: () => fetchPatientByCardNumber(cardNumber!),
    enabled: !!cardNumber && cardNumber.trim().length > 0,
    staleTime: 0,
  });
}
