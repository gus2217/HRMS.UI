// ============================================================
// clinics.ts — shared clinic catalog (mirrors backend ClinicType enum).
// Kenyan facility terminology (KEPH-aligned).
// ============================================================

export interface ClinicOption {
  value: string;
  label: string;
}

export const CLINIC_TYPES: ClinicOption[] = [
  { value: 'GeneralOutpatient', label: 'General outpatient' },
  { value: 'Counselling', label: 'Counselling' },
  { value: 'Laboratory', label: 'Laboratory' },
  { value: 'Immunization', label: 'Immunization' },
  { value: 'Wellness', label: 'Wellness' },
  { value: 'ReproductiveHealth', label: 'Reproductive health (RH)' },
  { value: 'ChildWelfare', label: 'Child welfare' },
  { value: 'MaternalChildHealth', label: 'Maternal & child health (MCH)' },
  { value: 'Antenatal', label: 'Antenatal (ANC)' },
  { value: 'Postnatal', label: 'Postnatal (PNC)' },
  { value: 'FamilyPlanning', label: 'Family planning' },
  { value: 'ComprehensiveCareCentre', label: 'Comprehensive care (CCC)' },
  { value: 'Tuberculosis', label: 'TB clinic' },
  { value: 'Nutrition', label: 'Nutrition' },
  { value: 'Dental', label: 'Dental' },
  { value: 'Eye', label: 'Eye clinic' },
  { value: 'Ent', label: 'ENT' },
  { value: 'Physiotherapy', label: 'Physiotherapy / rehab' },
  { value: 'AdolescentYouthFriendly', label: 'Adolescent & youth friendly' },
];

export const clinicLabel = (value: string): string =>
  CLINIC_TYPES.find((c) => c.value === value)?.label ?? value;

export const clinicShortCode = (value: string): string =>
  value
    .replace(/[a-z]/g, '')
    .slice(0, 4)
    .toUpperCase() || value.slice(0, 3).toUpperCase();
