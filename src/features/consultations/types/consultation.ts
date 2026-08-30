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

/** Structured medical documentation (CC → HPI → PMSHX → ROS → Exam). */
export interface ClinicalDocumentationDto {
  chiefComplaint: string | null;
  historyOfPresentingIllness: string | null;
  pastMedicalHistory: string | null;
  pastSurgicalHistory: string | null;
  familyHistory: string | null;
  socialHistory: string | null;
  gynaecologicalHistory: string | null;
  obstetricHistory: string | null;
  drugHistory: string | null;
  rosGeneral: string | null;
  rosCardiovascular: string | null;
  rosRespiratory: string | null;
  rosGastrointestinal: string | null;
  rosGenitourinary: string | null;
  rosMusculoskeletal: string | null;
  rosNeurological: string | null;
  rosDermatological: string | null;
  rosEntEyes: string | null;
  rosEndocrine: string | null;
  examGeneralAppearance: string | null;
  examHeadAndNeck: string | null;
  examCardiovascular: string | null;
  examRespiratory: string | null;
  examAbdominal: string | null;
  examGenitourinary: string | null;
  examMusculoskeletal: string | null;
  examNeurological: string | null;
  examSkin: string | null;
  examLymphatic: string | null;
  lastSavedAtUtc: string | null;
  lastSavedByUserId: string | null;
}

export interface ReferralDto {
  id: string;
  referredToFacility: string;
  referredToUnit: string | null;
  reason: string;
  priority: string;
  status: string;
  notes: string | null;
  referredAtUtc: string;
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
  documentation: ClinicalDocumentationDto | null;
  referrals: ReferralDto[];
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
