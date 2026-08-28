// ============================================================
// Inventory feature types (mirror backend DTOs).
// ============================================================

export interface DrugCatalogDto {
  id: string;
  code: string;
  name: string;
  form: string;
  unitPrice: number;
  reorderLevel: number;
  status: string;
}

export interface StockLevelDto {
  drugId: string;
  drugCode: string;
  drugName: string;
  quantityOnHand: number;
  reorderLevel: number;
}

export interface LowStockAlertDto {
  drugId: string;
  drugCode: string;
  drugName: string;
  quantityOnHand: number;
  reorderLevel: number;
}
