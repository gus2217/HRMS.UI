// ============================================================
// consultationService.ts
// Location: src/features/consultations/services/consultationService.ts
// ============================================================

import { http, type PagedResult } from '@/lib/apiClient';
import type { ConsultationDetail, ConsultationListItem, PatientClinicalHistory, PatientMedicalRecord } from '../types/consultation';

export interface TriageInput {
  temperatureCelsius?: number | null;
  bloodPressure?: string | null;
  pulseRate?: number | null;
  respiratoryRate?: number | null;
  weightKg?: number | null;
}

export interface DiagnosisInput {
  icdCode: string;
  description: string;
  isPrimary: boolean;
}

/** All sections of the structured clinical document (every field optional). */
export interface DocumentationInput {
  chiefComplaint?: string | null;
  historyOfPresentingIllness?: string | null;
  pastMedicalHistory?: string | null;
  pastSurgicalHistory?: string | null;
  familyHistory?: string | null;
  socialHistory?: string | null;
  gynaecologicalHistory?: string | null;
  obstetricHistory?: string | null;
  drugHistory?: string | null;
  rosGeneral?: string | null;
  rosCardiovascular?: string | null;
  rosRespiratory?: string | null;
  rosGastrointestinal?: string | null;
  rosGenitourinary?: string | null;
  rosMusculoskeletal?: string | null;
  rosNeurological?: string | null;
  rosDermatological?: string | null;
  rosEntEyes?: string | null;
  rosEndocrine?: string | null;
  examGeneralAppearance?: string | null;
  examHeadAndNeck?: string | null;
  examCardiovascular?: string | null;
  examRespiratory?: string | null;
  examAbdominal?: string | null;
  examGenitourinary?: string | null;
  examMusculoskeletal?: string | null;
  examNeurological?: string | null;
  examSkin?: string | null;
  examLymphatic?: string | null;
}

export interface ReferralInput {
  referredToFacility: string;
  referredToUnit?: string | null;
  reason: string;
  priority: 'Routine' | 'Urgent' | 'Emergency';
  notes?: string | null;
}

export const ConsultationService = {
  start(patientId: string, clinicianUserId: string): Promise<ConsultationDetail> {
    return http.post<ConsultationDetail>('/consultations', { patientId, clinicianUserId });
  },

  detail(id: string): Promise<ConsultationDetail> {
    return http.get<ConsultationDetail>(`/consultations/${id}`);
  },

  recordTriage(id: string, input: TriageInput): Promise<ConsultationDetail> {
    return http.post<ConsultationDetail>(`/consultations/${id}/triage`, input);
  },

  /** Advances Triaged → AwaitingClinician → InConsultation (backend workflow). */
  begin(id: string): Promise<ConsultationDetail> {
    return http.post<ConsultationDetail>(`/consultations/${id}/begin`);
  },

  recordDiagnosis(id: string, input: DiagnosisInput): Promise<ConsultationDetail> {
    return http.post<ConsultationDetail>(`/consultations/${id}/diagnoses`, input);
  },

  addNote(id: string, content: string): Promise<ConsultationDetail> {
    return http.post<ConsultationDetail>(`/consultations/${id}/notes`, { content });
  },

  /** Idempotent upsert of the structured clinical document — powers autosave. */
  saveDocumentation(id: string, input: DocumentationInput): Promise<ConsultationDetail> {
    return http.put<ConsultationDetail>(`/consultations/${id}/documentation`, input);
  },

  createReferral(id: string, input: ReferralInput): Promise<ConsultationDetail> {
    return http.post<ConsultationDetail>(`/consultations/${id}/referrals`, input);
  },

  complete(id: string): Promise<ConsultationDetail> {
    return http.post<ConsultationDetail>(`/consultations/${id}/complete`);
  },

  history(patientId: string): Promise<PatientClinicalHistory> {
    return http.get<PatientClinicalHistory>(`/patients/${patientId}/clinical-history`);
  },

  /** Full per-visit medical record — Clinical.View only. */
  medicalRecord(patientId: string): Promise<PatientMedicalRecord> {
    return http.get<PatientMedicalRecord>(`/patients/${patientId}/medical-record`);
  },

  list(pageNumber = 1, pageSize = 20, status?: string): Promise<PagedResult<ConsultationListItem>> {
    const q = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) });
    if (status) q.set('status', status);
    return http.get<PagedResult<ConsultationListItem>>(`/consultations?${q.toString()}`);
  },
};
