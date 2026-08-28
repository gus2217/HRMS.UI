// ============================================================
// inventoryService.ts
// Location: src/features/inventory/services/inventoryService.ts
// ============================================================

import { http } from '@/lib/apiClient';
import type { DrugCatalogDto, StockLevelDto, LowStockAlertDto } from '../types/inventory';

export const InventoryService = {
  createDrug(input: { code: string; name: string; form: string; unitPrice: number; reorderLevel: number }): Promise<DrugCatalogDto> {
    return http.post<DrugCatalogDto>('/inventory/drugs', input);
  },

  receiveStock(input: {
    drugId: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    unitCost: number;
    reference?: string | null;
  }): Promise<{ stockBatchId: string; batchNumber: string; quantityOnHand: number }> {
    return http.post('/inventory/stock/receive', input);
  },

  adjustStock(input: { stockBatchId: string; newQuantity: number; reason?: string | null }): Promise<{
    stockBatchId: string;
    batchNumber: string;
    quantityOnHand: number;
  }> {
    return http.post('/inventory/stock/adjust', input);
  },

  stockLevels(): Promise<StockLevelDto[]> {
    return http.get<StockLevelDto[]>('/inventory/stock-levels');
  },

  lowStock(): Promise<LowStockAlertDto[]> {
    return http.get<LowStockAlertDto[]>('/inventory/low-stock');
  },
};
