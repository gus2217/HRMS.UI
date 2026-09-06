// ============================================================
// Patient feature types (mirror backend DTOs).
// ============================================================

export interface PatientSummary {
  id: string;
  patientNumber: string;
  fullName: string;
  dateOfBirth: string;
  phone: string | null;
  lastVisitDate: string | null;
}

export interface AllergyDto {
  id: string;
  substance: string;
  severity: string;
  notes: string | null;
}

export interface ConsentDto {
  type: string;
  granted: boolean;
  recordedByUserId: string;
  recordedByName: string | null;
  recordedAtUtc: string;
}

/**
 * Consent types — values mirror the backend ConsentType enum exactly
 * (PatientRegistration.Domain: TreatmentConsent, DataSharingConsent,
 * ShaDataSharingConsent, ResearchConsent). The API binds enums by name,
 * so the UI must send these canonical values (sending friendly labels
 * such as "Treatment" causes a 400).
 */
export const CONSENT_TYPE_LABELS: Record<string, string> = {
  TreatmentConsent: 'Treatment consent',
  DataSharingConsent: 'Data sharing consent',
  ShaDataSharingConsent: 'SHA data sharing consent',
  ResearchConsent: 'Research consent',
};

export function consentTypeLabel(type: string): string {
  return CONSENT_TYPE_LABELS[type] ?? type;
}

export interface NextOfKinDto {
  fullName: string;
  relationship: string;
  phone: string | null;
}

export interface PatientDetail {
  id: string;
  patientNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  phone: string | null;
  insuranceType: string;
  insuranceNumber: string | null;
  clinicType: string;
  county: string;
  subCounty: string | null;
  ward: string | null;
  line1: string | null;
  village: string | null;
  landmark: string | null;
  educationLevel: string | null;
  occupation: string | null;
  alternativePhone: string | null;
  status: string;
  nationalId: string | null;
  createdByUserId: string;
  createdByName: string | null;
  createdAtUtc: string;
  modifiedByUserId: string | null;
  modifiedByName: string | null;
  modifiedAtUtc: string | null;
  allergies: AllergyDto[];
  consents: ConsentDto[];
  nextOfKin: NextOfKinDto[];
}

export interface DuplicateCandidate {
  id: string;
  patientNumber: string;
  fullName: string;
  dateOfBirth: string;
  phone: string | null;
  nationalId: string | null;
}

export interface RegisterPatientResponse {
  id: string;
  patientNumber: string;
  duplicateCandidates: DuplicateCandidate[];
}
