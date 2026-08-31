// ============================================================
// patientService.ts
// Location: src/features/patients/services/patientService.ts
// ============================================================

import { http, type PagedResult } from '@/lib/apiClient';
import type {
  PatientDetail,
  PatientSummary,
  RegisterPatientResponse,
} from '../types/patient';

export interface RegisterPatientInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  nationalId?: string | null;
  insuranceType: string;
  insuranceNumber?: string | null;
  clinicType: string;
  county: string;
  subCounty?: string | null;
  ward?: string | null;
  line1?: string | null;
}

export const PatientService = {
  register(input: RegisterPatientInput): Promise<RegisterPatientResponse> {
    return http.post<RegisterPatientResponse>('/patients', input);
  },

  search(search?: string, pageNumber = 1, pageSize = 50, sort?: 'latest' | 'name'): Promise<PagedResult<PatientSummary>> {
    const q = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) });
    if (search) q.set('search', search);
    if (sort) q.set('sort', sort);
    return http.get<PagedResult<PatientSummary>>(`/patients?${q.toString()}`);
  },

  detail(id: string): Promise<PatientDetail> {
    return http.get<PatientDetail>(`/patients/${id}`);
  },
};
