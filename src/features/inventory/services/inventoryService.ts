// ============================================================
// inventoryService.ts
// Location: src/features/inventory/services/inventoryService.ts
// ============================================================

import { http, type PagedResult } from '@/lib/apiClient';
import type { DrugCatalogDto, StockLevelDto, LowStockAlertDto } from '../types/inventory';

export const InventoryService = {
  createDrug(input: { code: string; name: string; form: string; unitPrice: number; reorderLevel: number }): Promise<DrugCatalogDto> {
    return http.post<DrugCatalogDto>('/inventory/drugs', input);
  },

  updateDrug(id: string, input: { name: string; category: string; form: string; unitPrice: number; reorderLevel: number }): Promise<DrugCatalogDto> {
    return http.put<DrugCatalogDto>(`/inventory/drugs/${id}`, input);
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

  catalog(search?: string, pageNumber = 1, pageSize = 100): Promise<PagedResult<DrugCatalogDto>> {
    const q = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) });
    if (search) q.set('search', search);
    return http.get<PagedResult<DrugCatalogDto>>(`/inventory/drugs?${q.toString()}`);
  },
};
