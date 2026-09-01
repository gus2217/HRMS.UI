// ============================================================
// Patient clinical-summary types (mirror backend DTOs).
// Vitals, immunizations and conditions persist across visits —
// independent of the consultation aggregate.
// ============================================================

export interface VitalSignDto {
  id: string;
  patientId: string;
  temperatureCelsius: number | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  pulseRate: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  recordedByUserId: string;
  recordedAtUtc: string;
}

export interface ImmunizationDto {
  id: string;
  patientId: string;
  vaccineName: string;
  doseNumber: number;
  administeredDate: string;
  nextDueDate: string | null;
  lotNumber: string | null;
  site: string | null;
  notes: string | null;
  recordedByUserId: string;
  recordedAtUtc: string;
}

export interface ConditionDto {
  id: string;
  patientId: string;
  code: string | null;
  description: string;
  status: 'Active' | 'Inactive' | 'Resolved';
  onsetDate: string;
  resolvedDate: string | null;
  recordedByUserId: string;
  recordedAtUtc: string;
}

export interface RecordVitalsInput {
  temperatureCelsius?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  pulseRate?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
}

export interface RecordImmunizationInput {
  vaccineName: string;
  doseNumber: number;
  administeredDate: string;
  nextDueDate?: string | null;
  lotNumber?: string | null;
  site?: string | null;
  notes?: string | null;
}

export interface AddConditionInput {
  code?: string | null;
  description: string;
  onsetDate: string;
}
