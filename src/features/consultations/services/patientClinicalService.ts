// ============================================================
// patientClinicalService.ts
// Location: src/features/consultations/services/patientClinicalService.ts
// ============================================================

import { http } from '@/lib/apiClient';
import type {
  VitalSignDto,
  ImmunizationDto,
  ConditionDto,
  RecordVitalsInput,
  RecordImmunizationInput,
  AddConditionInput,
} from '../types/patientClinical';

export const PatientClinicalService = {
  // ── Vitals ────────────────────────────────────────────────
  vitals(patientId: string): Promise<VitalSignDto[]> {
    return http.get<VitalSignDto[]>(`/patients/${patientId}/vitals`);
  },
  recordVitals(patientId: string, input: RecordVitalsInput): Promise<VitalSignDto> {
    return http.post<VitalSignDto>(`/patients/${patientId}/vitals`, input);
  },

  // ── Immunizations ─────────────────────────────────────────
  immunizations(patientId: string): Promise<ImmunizationDto[]> {
    return http.get<ImmunizationDto[]>(`/patients/${patientId}/immunizations`);
  },
  recordImmunization(patientId: string, input: RecordImmunizationInput): Promise<ImmunizationDto> {
    return http.post<ImmunizationDto>(`/patients/${patientId}/immunizations`, input);
  },

  // ── Conditions (problem list) ─────────────────────────────
  conditions(patientId: string): Promise<ConditionDto[]> {
    return http.get<ConditionDto[]>(`/patients/${patientId}/conditions`);
  },
  addCondition(patientId: string, input: AddConditionInput): Promise<ConditionDto> {
    return http.post<ConditionDto>(`/patients/${patientId}/conditions`, input);
  },
  resolveCondition(conditionId: string, resolvedDate: string): Promise<ConditionDto> {
    return http.post<ConditionDto>(`/conditions/${conditionId}/resolve`, { resolvedDate });
  },
};
