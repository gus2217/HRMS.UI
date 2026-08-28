// ============================================================
// billingService.ts
// Location: src/features/billing/services/billingService.ts
// ============================================================

import { http } from '@/lib/apiClient';
import type { InvoiceDetail, PaymentReceiptDto, ShaClaimSubmissionDto } from '../types/billing';

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

  submitShaClaim(invoiceId: string, shaClaimReference: string): Promise<ShaClaimSubmissionDto> {
    return http.post<ShaClaimSubmissionDto>('/billing/sha/claims', { invoiceId, shaClaimReference });
  },
};
