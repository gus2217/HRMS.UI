// ============================================================
// pharmacyService.ts
// Location: src/features/pharmacy/services/pharmacyService.ts
// ============================================================

import { http, type PagedResult } from '@/lib/apiClient';
import type { PrescriptionDetail, PrescriptionListItem } from '../types/pharmacy';

export interface PrescriptionItemInput {
  drugId: string;
  dosageInstructions: string;
  quantityPrescribed: number;
}

export interface CreatePrescriptionInput {
  patientId: string;
  consultationId: string;
  items: PrescriptionItemInput[];
}

export const PharmacyService = {
  createPrescription(input: CreatePrescriptionInput): Promise<PrescriptionDetail> {
    return http.post<PrescriptionDetail>('/pharmacy/prescriptions', input);
  },

  detail(id: string): Promise<PrescriptionDetail> {
    return http.get<PrescriptionDetail>(`/pharmacy/prescriptions/${id}`);
  },

  /** All prescriptions for a consultation, with items + dispense status. */
  byConsultation(consultationId: string): Promise<PrescriptionDetail[]> {
    return http.get<PrescriptionDetail[]>(`/pharmacy/consultations/${consultationId}/prescriptions`);
  },

  dispense(input: { prescriptionId: string; prescriptionItemId: string; quantity: number }): Promise<{
    dispenseRecordId: string;
    prescriptionItemId: string;
    quantityDispensed: number;
  }> {
    return http.post('/pharmacy/dispense', input);
  },

  list(pageNumber = 1, pageSize = 20, status?: string, patientId?: string): Promise<PagedResult<PrescriptionListItem>> {
    const q = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) });
    if (status) q.set('status', status);
    if (patientId) q.set('patientId', patientId);
    return http.get<PagedResult<PrescriptionListItem>>(`/pharmacy/prescriptions?${q.toString()}`);
  },
};
