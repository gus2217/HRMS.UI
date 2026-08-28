// ============================================================
// auditService.ts
// Location: src/features/audit/services/auditService.ts
// ============================================================

import { http, type PagedResult } from '@/lib/apiClient';
import type { AuditLogEntryDto } from '../types/audit';

export const AuditService = {
  search(entityType?: string, pageNumber = 1, pageSize = 100): Promise<PagedResult<AuditLogEntryDto>> {
    const q = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) });
    if (entityType) q.set('entityType', entityType);
    return http.get<PagedResult<AuditLogEntryDto>>(`/audit?${q.toString()}`);
  },
};
