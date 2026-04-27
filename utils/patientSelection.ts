import type { PatientMember, PatientRecord } from '@/types/patient';

/**
 * `memberIndex` null = primary cardholder; otherwise index into `members`.
 */
export function patientRecordForMember(
  base: PatientRecord,
  memberIndex: number | null,
): PatientRecord {
  if (memberIndex == null) return base;
  const m = base.members?.[memberIndex];
  if (!m) return base;
  return memberToActiveRecord(base, m);
}

export function memberToActiveRecord(
  base: PatientRecord,
  member: PatientMember,
): PatientRecord {
  return {
    ...base,
    name: member.name,
    photo: member.photo,
    mobile: member.mobile,
  };
}
