// ============================================================
// Reports feature types (mirror backend reporting DTOs).
// ============================================================

export interface DailyRegistrationsReport {
  date: string;
  registrations: number;
}

export interface RevenueByServiceReport {
  serviceCode: string;
  description: string;
  totalRevenue: number;
}

export interface StockLevelReportDto {
  drugId: string;
  drugCode: string;
  drugName: string;
  quantityOnHand: number;
}

export interface ShaClaimStatusReport {
  status: string;
  claimCount: number;
  totalAmount: number;
}

export interface ClinicianWorkloadReport {
  clinicianUserId: string;
  consultationCount: number;
}
