// ============================================================
// inpatientService.ts
// Location: src/features/inpatient/services/inpatientService.ts
// ============================================================

import { http, type PagedResult } from '@/lib/apiClient';
import type { AdmissionDetail, AdmissionListItem, WardOccupancyDto } from '../types/inpatient';

export const InpatientService = {
  admit(input: {
    patientId: string;
    admittingClinicianUserId: string;
    wardName: string;
    bedNumber: string;
  }): Promise<AdmissionDetail> {
    return http.post<AdmissionDetail>('/inpatient/admissions', input);
  },

  detail(id: string): Promise<AdmissionDetail> {
    return http.get<AdmissionDetail>(`/inpatient/admissions/${id}`);
  },

  discharge(id: string): Promise<AdmissionDetail> {
    return http.post<AdmissionDetail>(`/inpatient/admissions/${id}/discharge`);
  },

  addNote(id: string, content: string): Promise<AdmissionDetail> {
    return http.post<AdmissionDetail>(`/inpatient/admissions/${id}/notes`, { content });
  },

  wardOccupancy(): Promise<WardOccupancyDto[]> {
    return http.get<WardOccupancyDto[]>('/inpatient/ward-occupancy');
  },

  list(pageNumber = 1, pageSize = 20, activeOnly = true): Promise<PagedResult<AdmissionListItem>> {
    const q = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize), activeOnly: String(activeOnly) });
    return http.get<PagedResult<AdmissionListItem>>(`/inpatient/admissions?${q.toString()}`);
  },
};
