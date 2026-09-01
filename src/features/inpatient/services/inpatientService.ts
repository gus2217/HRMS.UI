// ============================================================
// inpatientService.ts
// Location: src/features/inpatient/services/inpatientService.ts
// ============================================================

import { http, type PagedResult } from '@/lib/apiClient';
import type {
  AdmissionDetail,
  AdmissionListItem,
  WardDto,
  WardOccupancyDto,
  WardType,
} from '../types/inpatient';

export const InpatientService = {
  // ── Wards (admin) ─────────────────────────────────────────
  wards(activeOnly = false): Promise<WardDto[]> {
    return http.get<WardDto[]>(`/inpatient/wards?activeOnly=${activeOnly}`);
  },
  createWard(input: { name: string; type: WardType; totalBeds: number }): Promise<WardDto> {
    return http.post<WardDto>('/inpatient/wards', input);
  },
  updateWard(id: string, input: { name: string; type: WardType; totalBeds: number }): Promise<WardDto> {
    return http.put<WardDto>(`/inpatient/wards/${id}`, input);
  },
  deactivateWard(id: string): Promise<WardDto> {
    return http.post<WardDto>(`/inpatient/wards/${id}/deactivate`);
  },

  reactivateWard(id: string): Promise<WardDto> {
    return http.post<WardDto>(`/inpatient/wards/${id}/reactivate`);
  },

  // ── Admissions ─────────────────────────────────────────────
  admit(input: {
    patientId: string;
    admittingClinicianUserId: string;
    wardId: string;
    bedNumber: string;
    admittingDiagnosis?: string | null;
    attendingClinicianUserId?: string | null;
  }): Promise<AdmissionDetail> {
    return http.post<AdmissionDetail>('/inpatient/admissions', input);
  },

  detail(id: string): Promise<AdmissionDetail> {
    return http.get<AdmissionDetail>(`/inpatient/admissions/${id}`);
  },

  discharge(id: string): Promise<AdmissionDetail> {
    return http.post<AdmissionDetail>(`/inpatient/admissions/${id}/discharge`);
  },

  transfer(id: string, input: { targetWardId: string; bedNumber: string }): Promise<AdmissionDetail> {
    return http.post<AdmissionDetail>(`/inpatient/admissions/${id}/transfer`, input);
  },

  addNote(id: string, content: string): Promise<AdmissionDetail> {
    return http.post<AdmissionDetail>(`/inpatient/admissions/${id}/notes`, { content });
  },

  // ── Day-to-day ward medical records (SOAP + vitals + media) ──
  addMedicalRecord(id: string, input: {
    temperatureCelsius?: number | null;
    systolicBp?: number | null;
    diastolicBp?: number | null;
    pulseRate?: number | null;
    respiratoryRate?: number | null;
    oxygenSaturation?: number | null;
    weightKg?: number | null;
    subjective?: string | null;
    objective?: string | null;
    assessment?: string | null;
    plan?: string | null;
  }): Promise<AdmissionDetail> {
    return http.post<AdmissionDetail>(`/inpatient/admissions/${id}/medical-records`, input);
  },

  attachFile(recordId: string, file: File): Promise<AdmissionDetail> {
    const form = new FormData();
    form.append('file', file);
    return http.post<AdmissionDetail>(`/inpatient/medical-records/${recordId}/attachments`, form);
  },

  attachmentDownloadUrl(recordId: string, attachmentId: string): string {
    return `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/inpatient/medical-records/${recordId}/attachments/${attachmentId}/download`;
  },

  wardOccupancy(): Promise<WardOccupancyDto[]> {
    return http.get<WardOccupancyDto[]>('/inpatient/ward-occupancy');
  },

  list(pageNumber = 1, pageSize = 20, activeOnly = true, patientId?: string): Promise<PagedResult<AdmissionListItem>> {
    const q = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize), activeOnly: String(activeOnly) });
    if (patientId) q.set('patientId', patientId);
    return http.get<PagedResult<AdmissionListItem>>(`/inpatient/admissions?${q.toString()}`);
  },
};
