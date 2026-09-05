// ============================================================
// flagsAttachmentsOrdersService.ts
// ============================================================

import { http } from '@/lib/apiClient';
import type {
  PatientFlagDto,
  PatientAttachmentDto,
  DiagnosticOrderDto,
  RaiseFlagInput,
  CreateDiagnosticOrderInput,
} from '../types/flagsAttachmentsOrders';

export const FlagsAttachmentsOrdersService = {
  // ── Flags ────────────────────────────────────────────────
  activeFlags(patientId: string): Promise<PatientFlagDto[]> {
    return http.get<PatientFlagDto[]>(`/patients/${patientId}/flags`);
  },
  allFlags(patientId: string): Promise<PatientFlagDto[]> {
    return http.get<PatientFlagDto[]>(`/patients/${patientId}/flags/all`);
  },
  raiseFlag(patientId: string, input: RaiseFlagInput): Promise<PatientFlagDto> {
    return http.post<PatientFlagDto>(`/patients/${patientId}/flags`, input);
  },
  deactivateFlag(flagId: string): Promise<PatientFlagDto> {
    return http.post<PatientFlagDto>(`/flags/${flagId}/deactivate`);
  },

  // ── Attachments ──────────────────────────────────────────
  attachments(patientId: string): Promise<PatientAttachmentDto[]> {
    return http.get<PatientAttachmentDto[]>(`/patients/${patientId}/attachments`);
  },
  upload(patientId: string, file: File, category: string): Promise<PatientAttachmentDto> {
    const form = new FormData();
    form.append('file', file);
    form.append('category', category);
    return http.post<PatientAttachmentDto>(`/patients/${patientId}/attachments`, form);
  },
  downloadUrl(attachmentId: string): string {
    return `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/attachments/${attachmentId}/download`;
  },
  removeAttachment(attachmentId: string): Promise<void> {
    return http.delete<void>(`/attachments/${attachmentId}`);
  },

  // ── Diagnostic orders ────────────────────────────────────
  createOrder(input: CreateDiagnosticOrderInput): Promise<DiagnosticOrderDto> {
    return http.post<DiagnosticOrderDto>('/diagnostic-orders', input);
  },
  byPatient(patientId: string): Promise<DiagnosticOrderDto[]> {
    return http.get<DiagnosticOrderDto[]>(`/patients/${patientId}/diagnostic-orders`);
  },
  byConsultation(consultationId: string): Promise<DiagnosticOrderDto[]> {
    return http.get<DiagnosticOrderDto[]>(`/consultations/${consultationId}/diagnostic-orders`);
  },
  perform(orderId: string): Promise<DiagnosticOrderDto> {
    return http.post<DiagnosticOrderDto>(`/diagnostic-orders/${orderId}/perform`);
  },
  schedule(orderId: string): Promise<DiagnosticOrderDto> {
    return http.post<DiagnosticOrderDto>(`/diagnostic-orders/${orderId}/schedule`);
  },
  report(orderId: string, report: string): Promise<DiagnosticOrderDto> {
    return http.post<DiagnosticOrderDto>(`/diagnostic-orders/${orderId}/report`, { report });
  },
  cancel(orderId: string, reason: string): Promise<DiagnosticOrderDto> {
    return http.post<DiagnosticOrderDto>(`/diagnostic-orders/${orderId}/cancel`, { reason });
  },
};
