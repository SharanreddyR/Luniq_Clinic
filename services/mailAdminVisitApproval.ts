import { Platform } from 'react-native';
import * as MailComposer from 'expo-mail-composer';

import { ADMIN_CLAIM_APPROVAL_EMAIL, APP_NAME } from '@/constants/config';

export type MailComposeResult =
  | { ok: true }
  | { ok: false; reason: 'web' | 'unavailable' | 'error'; message: string };

/**
 * Opens the device mail composer so staff can send the visit PDF to admin for approval.
 * On web, returns unavailable (use a desktop mail client with the PDF export if needed).
 */
export async function composeAdminVisitApprovalEmail(params: {
  slipId: string;
  patientName: string;
  pdfUri: string | null;
}): Promise<MailComposeResult> {
  if (Platform.OS === 'web') {
    return {
      ok: false,
      reason: 'web',
      message:
        'On web, open your mail app and attach the visit PDF manually if needed.',
    };
  }

  try {
    const available = await MailComposer.isAvailableAsync();
    if (!available) {
      return {
        ok: false,
        reason: 'unavailable',
        message:
          'No mail app is configured on this device. Forward the visit PDF to admin from another device.',
      };
    }

    await MailComposer.composeAsync({
      recipients: [ADMIN_CLAIM_APPROVAL_EMAIL],
      subject: `[${APP_NAME}] Admin approval — visit ${params.slipId} — ${params.patientName}`,
      body:
        `Please review the visit summary (attached PDF when available) and approve for claims.\n\n` +
        `Target: about 10–15 minutes for lead review and background verification.\n` +
        `After approval, an approved report is sent to the patient and the clinic.\n`,
      attachments: params.pdfUri ? [params.pdfUri] : undefined,
    });
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: 'error',
      message: 'Could not open the mail composer.',
    };
  }
}
