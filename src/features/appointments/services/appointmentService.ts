// ============================================================
// appointmentService.ts
// Location: src/features/appointments/services/appointmentService.ts
// ============================================================

import { http, type PagedResult } from '@/lib/apiClient';
import type { Appointment, AppointmentRequest, StartAppointmentResponse } from '../types/appointment';

export const AppointmentService = {
  create(input: {
    patientId: string;
    clinicType: string;
    type: string;
    scheduledAtUtc: string;
    durationMinutes: number;
    reason?: string | null;
    recurrencePattern?: string | null;
    recurrenceCount?: number;
    recurrenceEndDate?: string | null;
  }): Promise<Appointment[]> {
    return http.post<Appointment[]>('/appointments', {
      ...input,
      durationMinutes: input.durationMinutes || 20,
      recurrencePattern: input.recurrencePattern || 'None',
      recurrenceCount: input.recurrenceCount || 1,
    });
  },

  list(filters: { clinicType?: string; status?: string; fromUtc?: string; toUtc?: string; pageNumber?: number; pageSize?: number } = {}): Promise<PagedResult<Appointment>> {
    const q = new URLSearchParams({ pageNumber: '1', pageSize: '100' });
    if (filters.clinicType) q.set('clinicType', filters.clinicType);
    if (filters.status) q.set('status', filters.status);
    if (filters.fromUtc) q.set('fromUtc', filters.fromUtc);
    if (filters.toUtc) q.set('toUtc', filters.toUtc);
    return http.get<PagedResult<Appointment>>(`/appointments?${q.toString()}`);
  },

  /** All appointments in a month (calendar view). */
  calendar(year: number, month: number, clinicType?: string): Promise<Appointment[]> {
    const q = new URLSearchParams({ year: String(year), month: String(month) });
    if (clinicType) q.set('clinicType', clinicType);
    return http.get<Appointment[]>(`/appointments/calendar?${q.toString()}`);
  },

  /** Day queue — today's appointments. */
  today(clinicType?: string): Promise<Appointment[]> {
    const now = new Date();
    const fromUtc = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const toUtc = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const q = new URLSearchParams({ fromUtc, toUtc, pageSize: '100' });
    if (clinicType) q.set('clinicType', clinicType);
    return http.get<PagedResult<Appointment>>(`/appointments?${q.toString()}`).then((r) => r.items);
  },

  start(id: string): Promise<StartAppointmentResponse> {
    return http.post<StartAppointmentResponse>(`/appointments/${id}/start`);
  },

  complete(id: string): Promise<Appointment> {
    return http.post<Appointment>(`/appointments/${id}/complete`);
  },

  cancel(id: string): Promise<Appointment> {
    return http.post<Appointment>(`/appointments/${id}/cancel`);
  },

  noShow(id: string): Promise<Appointment> {
    return http.post<Appointment>(`/appointments/${id}/no-show`);
  },

  // ── Requests ──────────────────────────────────────────────

  createRequest(input: { patientId: string; clinicType: string; reason: string; notes?: string | null; preferredDate?: string | null }): Promise<AppointmentRequest> {
    return http.post<AppointmentRequest>('/appointment-requests', input);
  },

  listRequests(status?: string, clinicType?: string): Promise<PagedResult<AppointmentRequest>> {
    const q = new URLSearchParams({ pageNumber: '1', pageSize: '100' });
    if (status) q.set('status', status);
    if (clinicType) q.set('clinicType', clinicType);
    return http.get<PagedResult<AppointmentRequest>>(`/appointment-requests?${q.toString()}`);
  },

  approveRequest(id: string, input: { scheduledAtUtc: string; durationMinutes: number; type: string }): Promise<Appointment> {
    return http.post<Appointment>(`/appointment-requests/${id}/approve`, input);
  },

  declineRequest(id: string): Promise<AppointmentRequest> {
    return http.post<AppointmentRequest>(`/appointment-requests/${id}/decline`);
  },
};
