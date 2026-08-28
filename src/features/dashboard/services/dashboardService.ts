// ============================================================
// dashboardService.ts
// Location: src/features/dashboard/services/dashboardService.ts
//
// Aggregates the facility overview data: dashboard summary KPIs +
// low-stock alerts.
// ============================================================

import { http, type PagedResult } from '@/lib/apiClient';
import type { FacilityDashboardSummary, LowStockAlertDto } from '../types/dashboard';

export const DashboardService = {
  async getSummary(): Promise<FacilityDashboardSummary> {
    return http.get<FacilityDashboardSummary>('/reports/dashboard');
  },

  async getLowStock(): Promise<LowStockAlertDto[]> {
    return http.get<LowStockAlertDto[]>('/inventory/low-stock');
  },

  // Used by Patients quick-search components across features.
  async searchPatients(term?: string, pageNumber = 1, pageSize = 50) {
    const q = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) });
    if (term) q.set('search', term);
    return http.get<PagedResult<import('@/features/patients/types/patient').PatientSummary>>(`/patients?${q.toString()}`);
  },
};
