import { api } from '@/services/api';

/** Shown on the claim screen for turnaround expectations */
export const CLAIM_VERIFICATION_TAT = 'Verification within 3–4 hours';

export type ClaimSubmitPayload = {
  description: string;
  policyReference?: string;
};

export type ClaimSubmitResponse = {
  claimId: string;
  message?: string;
};

export type ClaimStatusResponse = {
  status: string;
  claimId?: string;
  message?: string;
  updatedAt?: string;
};

export async function submitClaim(
  payload: ClaimSubmitPayload,
): Promise<ClaimSubmitResponse> {
  try {
    const { data } = await api.post<ClaimSubmitResponse>('/claim', {
      ...payload,
      submittedAt: new Date().toISOString(),
    });
    return data;
  } catch {
    await delay(650);
    if (!payload.description?.trim()) {
      throw new Error('Please describe your claim.');
    }
    return {
      claimId: `CLM-${Date.now()}`,
      message: 'Claim submitted (demo)',
    };
  }
}

export async function fetchClaimStatus(
  claimId: string | null,
): Promise<ClaimStatusResponse> {
  try {
    const { data } = await api.get<ClaimStatusResponse>('/claim-status', {
      params: claimId ? { claimId } : undefined,
    });
    return data;
  } catch {
    await delay(450);
    return {
      status: 'Pending verification',
      claimId: claimId ?? undefined,
      message:
        claimId != null
          ? 'We are reviewing your documents.'
          : 'Submit a claim to track status here.',
    };
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
