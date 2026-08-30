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
  substance: string;
  severity: string;
  notes: string | null;
}

export interface ConsentDto {
  type: string;
  granted: boolean;
  recordedAtUtc: string;
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
  status: string;
  allergies: AllergyDto[];
  consents: ConsentDto[];
  nextOfKin: NextOfKinDto[];
}

export interface DuplicateCandidate {
  id: string;
  patientNumber: string;
  fullName: string;
  dateOfBirth: string;
  nationalId: string | null;
}

export interface RegisterPatientResponse {
  id: string;
  patientNumber: string;
  duplicateCandidates: DuplicateCandidate[];
}
