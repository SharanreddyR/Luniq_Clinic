import type { UploadCategory } from '@/services/uploadService';

export type VisitAttachmentCategory = UploadCategory | 'supporting';

export type VisitAttachmentMeta = {
  category: VisitAttachmentCategory;
  files: { name: string; mimeType: string | null }[];
};

/** One completed visit, stored on device for Reports */
export type ClinicVisitRecord = {
  id: string;
  patientId: number;
  patientName: string;
  patientCardNumber: string;
  completedAt: string;
  slipId: string;
  doctorName: string;
  department: string;
  services: string[];
  serviceAmounts: Record<string, string>;
  totalAmount: string;
  symptoms: string;
  attachments: VisitAttachmentMeta[];
};
