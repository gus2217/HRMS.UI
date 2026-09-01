// ============================================================
// billingService.ts
// Location: src/features/billing/services/billingService.ts
// ============================================================

import { http, type PagedResult } from '@/lib/apiClient';
import type { InvoiceDetail, InvoiceListItem, PaymentReceiptDto, ShaClaimSubmissionDto } from '../types/billing';

export const BillingService = {
  issueInvoice(input: {
    patientId: string;
    consultationId?: string | null;
    primaryPaymentMethod?: string | null;
    lines: { serviceCode: string; description: string; quantity: number; unitPrice: number }[];
  }): Promise<InvoiceDetail> {
    return http.post<InvoiceDetail>('/billing/invoices', input);
  },

  detail(id: string): Promise<InvoiceDetail> {
    return http.get<InvoiceDetail>(`/billing/invoices/${id}`);
  },

  recordPayment(input: {
    invoiceId: string;
    amountPaid: number;
    method: string;
    providerTransactionReference: string;
  }): Promise<PaymentReceiptDto> {
    return http.post<PaymentReceiptDto>('/billing/payments', input);
  },

  cancelInvoice(invoiceId: string): Promise<InvoiceDetail> {
    return http.post<InvoiceDetail>(`/billing/invoices/${invoiceId}/cancel`);
  },

  submitShaClaim(invoiceId: string, shaClaimReference: string): Promise<ShaClaimSubmissionDto> {
    return http.post<ShaClaimSubmissionDto>('/billing/sha/claims', { invoiceId, shaClaimReference });
  },

  list(pageNumber = 1, pageSize = 20, status?: string, consultationId?: string): Promise<PagedResult<InvoiceListItem>> {
    const q = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) });
    if (status) q.set('status', status);
    if (consultationId) q.set('consultationId', consultationId);
    return http.get<PagedResult<InvoiceListItem>>(`/billing/invoices?${q.toString()}`);
  },
};
