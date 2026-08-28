// ============================================================
// reportService.ts
// Location: src/features/reports/services/reportService.ts
// ============================================================

import { http } from '@/lib/apiClient';
import type {
  ClinicianWorkloadReport,
  DailyRegistrationsReport,
  RevenueByServiceReport,
  ShaClaimStatusReport,
  StockLevelReportDto,
} from '../types/reports';

export const ReportService = {
  registrations(from: string, to: string): Promise<DailyRegistrationsReport[]> {
    const q = new URLSearchParams({ from, to });
    return http.get<DailyRegistrationsReport[]>(`/reports/registrations?${q.toString()}`);
  },

  revenueByService(): Promise<RevenueByServiceReport[]> {
    return http.get<RevenueByServiceReport[]>('/reports/revenue-by-service');
  },

  stockLevels(): Promise<StockLevelReportDto[]> {
    return http.get<StockLevelReportDto[]>('/reports/stock-levels');
  },

  shaClaims(): Promise<ShaClaimStatusReport[]> {
    return http.get<ShaClaimStatusReport[]>('/reports/sha-claims');
  },

  clinicianWorkload(): Promise<ClinicianWorkloadReport[]> {
    return http.get<ClinicianWorkloadReport[]>('/reports/clinician-workload');
  },
};
