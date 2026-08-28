// ============================================================
// consultationService.ts
// Location: src/features/consultations/services/consultationService.ts
// ============================================================

import { http, type PagedResult } from '@/lib/apiClient';
import type { ConsultationDetail, ConsultationListItem, PatientClinicalHistory } from '../types/consultation';

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

  complete(id: string): Promise<ConsultationDetail> {
    return http.post<ConsultationDetail>(`/consultations/${id}/complete`);
  },

  history(patientId: string): Promise<PatientClinicalHistory> {
    return http.get<PatientClinicalHistory>(`/patients/${patientId}/clinical-history`);
  },

  list(pageNumber = 1, pageSize = 20, status?: string): Promise<PagedResult<ConsultationListItem>> {
    const q = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) });
    if (status) q.set('status', status);
    return http.get<PagedResult<ConsultationListItem>>(`/consultations?${q.toString()}`);
  },
};
