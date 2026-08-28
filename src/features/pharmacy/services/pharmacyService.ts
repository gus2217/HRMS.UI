// ============================================================
// pharmacyService.ts
// Location: src/features/pharmacy/services/pharmacyService.ts
// ============================================================

import { http } from '@/lib/apiClient';
import type { PrescriptionDetail } from '../types/pharmacy';

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

  dispense(input: { prescriptionId: string; prescriptionItemId: string; quantity: number }): Promise<{
    dispenseRecordId: string;
    prescriptionItemId: string;
    quantityDispensed: number;
  }> {
    return http.post('/pharmacy/dispense', input);
  },
};
