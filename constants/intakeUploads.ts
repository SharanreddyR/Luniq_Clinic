import type { UploadCategory } from '@/services/uploadService';

export const INTAKE_UPLOAD_ROWS: {
  category: UploadCategory;
  label: string;
  icon: string;
}[] = [
  { category: 'prescription', label: 'Prescription', icon: 'pill' },
  { category: 'report', label: 'Lab / imaging report', icon: 'file-document' },
  { category: 'bill', label: 'Bill / receipt', icon: 'receipt' },
];

/** Visit intake Step 2 — single combined bill upload (upload or capture). */
export const VISIT_ENTIRE_BILL_UPLOAD = {
  category: 'bill' as const,
  label: 'Entire bill',
  icon: 'receipt',
};
