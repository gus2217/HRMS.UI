// ============================================================
// Billing feature types (mirror backend DTOs).
// ============================================================

export interface InvoiceLineDto {
  id: string;
  serviceCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceDetail {
  id: string;
  patientId: string;
  consultationId: string | null;
  status: string;
  totalAmount: number;
  primaryPaymentMethod: string | null;
  lines: InvoiceLineDto[];
}

export interface PaymentReceiptDto {
  paymentId: string;
  invoiceId: string;
  amountPaid: number;
  method: string;
  providerTransactionReference: string;
  status: string;
}

export interface ShaClaimSubmissionDto {
  shaClaimId: string;
  invoiceId: string;
  shaClaimReference: string;
  status: string;
}
