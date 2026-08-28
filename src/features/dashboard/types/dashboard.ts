// ============================================================
// Dashboard feature types (mirror backend reporting DTOs).
// ============================================================

export interface FacilityDashboardSummary {
  totalPatients: number;
  openAdmissions: number;
  totalRevenue: number;
  pendingLabOrders: number;
  lowStockItems: number;
}

export interface LowStockAlertDto {
  drugId: string;
  drugCode: string;
  drugName: string;
  quantityOnHand: number;
  reorderLevel: number;
}
