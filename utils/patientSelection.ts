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
  const personId =
    typeof member.personId === 'number' && Number.isFinite(member.personId)
      ? member.personId
      : typeof member.id === 'number' && Number.isFinite(member.id)
        ? member.id
        : base.id;

  return {
    ...base,
    id: personId,
    name: member.name,
    photo: member.photo,
    mobile: member.mobile,
  };
}
