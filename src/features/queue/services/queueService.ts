// ============================================================
// queueService.ts
// Location: src/features/queue/services/queueService.ts
// ============================================================

import { http, type PagedResult } from '@/lib/apiClient';
import type { AcceptQueueResponse, QueueEntry } from '../types/queue';

export const QueueService = {
  create(input: { patientId: string; clinicType: string; priority: string; notes?: string | null }): Promise<QueueEntry> {
    return http.post<QueueEntry>('/queue', input);
  },

  list(clinicType?: string, status?: string, pageNumber = 1, pageSize = 50): Promise<PagedResult<QueueEntry>> {
    const q = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) });
    if (clinicType) q.set('clinicType', clinicType);
    if (status) q.set('status', status);
    return http.get<PagedResult<QueueEntry>>(`/queue?${q.toString()}`);
  },

  /** Clinician accepts → registers the consultation atomically. */
  accept(id: string): Promise<AcceptQueueResponse> {
    return http.post<AcceptQueueResponse>(`/queue/${id}/accept`);
  },

  cancel(id: string): Promise<QueueEntry> {
    return http.post<QueueEntry>(`/queue/${id}/cancel`);
  },
};
