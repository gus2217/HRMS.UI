// ============================================================
// patientService.ts
// Location: src/features/patients/services/patientService.ts
// ============================================================

import { http, type PagedResult } from '@/lib/apiClient';
import type {
  PatientDetail,
  PatientSummary,
  RegisterPatientResponse,
  DuplicateCandidate,
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

  /** Pre-registration duplicate check by phone and/or NationalId. */
  checkDuplicates(phone?: string, nationalId?: string): Promise<DuplicateCandidate[]> {
    const q = new URLSearchParams();
    if (phone) q.set('phone', phone);
    if (nationalId) q.set('nationalId', nationalId);
    return http.get<DuplicateCandidate[]>(`/patients/check?${q.toString()}`);
  },

  detail(id: string): Promise<PatientDetail> {
    return http.get<PatientDetail>(`/patients/${id}`);
  },
};
