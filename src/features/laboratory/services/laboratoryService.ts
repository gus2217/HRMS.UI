// ============================================================
// laboratoryService.ts
// Location: src/features/laboratory/services/laboratoryService.ts
// ============================================================

import { http, type PagedResult } from '@/lib/apiClient';
import type { LabOrderDetail, LabOrderListItem } from '../types/laboratory';

export const LaboratoryService = {
  createOrder(input: {
    patientId: string;
    consultationId: string;
    tests: { testCode: string; testName: string }[];
  }): Promise<LabOrderDetail> {
    return http.post<LabOrderDetail>('/lab/orders', input);
  },

  detail(id: string): Promise<LabOrderDetail> {
    return http.get<LabOrderDetail>(`/lab/orders/${id}`);
  },

  /** All lab orders for a consultation, with tests + results. */
  byConsultation(consultationId: string): Promise<LabOrderDetail[]> {
    return http.get<LabOrderDetail[]>(`/lab/consultations/${consultationId}/orders`);
  },

  recordResult(
    id: string,
    input: {
      testItemId: string;
      resultValue?: string | null;
      resultUnit?: string | null;
      referenceRange?: string | null;
      isAbnormal?: boolean | null;
    },
  ): Promise<LabOrderDetail> {
    return http.post<LabOrderDetail>(`/lab/orders/${id}/results`, input);
  },

  list(pageNumber = 1, pageSize = 20, status?: string, patientId?: string): Promise<PagedResult<LabOrderListItem>> {
    const q = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) });
    if (status) q.set('status', status);
    if (patientId) q.set('patientId', patientId);
    return http.get<PagedResult<LabOrderListItem>>(`/lab/orders?${q.toString()}`);
  },
};
