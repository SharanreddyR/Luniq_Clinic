import { useMutation, useQueryClient } from '@tanstack/react-query';

import { CLINIC_TIMINGS_API_QUERY_KEY } from '@/hooks/useClinicTimingsApiQuery';
import {
  type ClinicTimingBulkSaveRow,
  markClinicTimingLeave,
  removeClinicTimingLeave,
  saveClinicTimingsBulk,
} from '@/services/clinicTimingService';

const PROFILE_WEEKLY_KEY = ['clinic-profile-weekly-timings'] as const;

function invalidateTimingQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: [...CLINIC_TIMINGS_API_QUERY_KEY] });
  void qc.invalidateQueries({ queryKey: [...PROFILE_WEEKLY_KEY] });
}

export function useSaveClinicTimingsBulkMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: ClinicTimingBulkSaveRow[]) => saveClinicTimingsBulk(rows),
    onSuccess: () => invalidateTimingQueries(qc),
  });
}

export function useMarkClinicTimingLeaveMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (day: string) => markClinicTimingLeave(day),
    onSuccess: () => invalidateTimingQueries(qc),
  });
}

export function useRemoveClinicTimingLeaveMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      day,
      opensAt,
      closesAt,
    }: {
      day: string;
      opensAt: string;
      closesAt: string;
    }) => removeClinicTimingLeave(day, opensAt, closesAt),
    onSuccess: () => invalidateTimingQueries(qc),
  });
}
