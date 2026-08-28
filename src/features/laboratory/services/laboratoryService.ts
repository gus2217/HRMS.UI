// ============================================================
// laboratoryService.ts
// Location: src/features/laboratory/services/laboratoryService.ts
// ============================================================

import { http } from '@/lib/apiClient';
import type { LabOrderDetail } from '../types/laboratory';

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
};
