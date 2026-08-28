// ============================================================
// Consultation feature types (mirror backend DTOs).
// ============================================================

import type { PatientDetail } from '@/features/patients/types/patient';

export type { PatientDetail };

export interface TriageDataDto {
  temperatureCelsius: number | null;
  bloodPressure: string | null;
  pulseRate: number | null;
  respiratoryRate: number | null;
  weightKg: number | null;
}

export interface DiagnosisDto {
  icdCode: string;
  description: string;
  isPrimary: boolean;
}

export interface ClinicalNoteDto {
  content: string;
  authorUserId: string;
  recordedAtUtc: string;
}

export interface ConsultationDetail {
  id: string;
  patientId: string;
  clinicianUserId: string;
  status: string;
  startedAtUtc: string;
  completedAtUtc: string | null;
  triage: TriageDataDto | null;
  diagnoses: DiagnosisDto[];
  notes: ClinicalNoteDto[];
}

export interface ConsultationSummary {
  id: string;
  patientId: string;
  clinicianUserId: string;
  status: string;
  startedAtUtc: string;
  completedAtUtc: string | null;
}

export interface ConsultationListItem {
  id: string;
  patientId: string;
  patientNumber: string;
  patientName: string;
  clinicianUserId: string;
  status: string;
  startedAtUtc: string;
  completedAtUtc: string | null;
}

export interface PatientClinicalHistory {
  patientId: string;
  consultations: ConsultationSummary[];
  diagnoses: DiagnosisDto[];
  notes: ClinicalNoteDto[];
}
