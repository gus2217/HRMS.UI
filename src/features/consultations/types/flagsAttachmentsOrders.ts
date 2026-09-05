// ============================================================
// Patient flags, attachments and diagnostic-order types.
// ============================================================

export interface PatientFlagDto {
  id: string;
  patientId: string;
  type: 'Allergy' | 'Warning' | 'Info' | 'Medical';
  message: string;
  isActive: boolean;
  createdByUserId: string;
  createdAtUtc: string;
  deactivatedByUserId: string | null;
  deactivatedAtUtc: string | null;
}

export interface PatientAttachmentDto {
  id: string;
  patientId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  category: string;
  uploadedByUserId: string;
  uploadedAtUtc: string;
}

export type DiagnosticOrderType = 'Imaging' | 'Procedure';
export type DiagnosticOrderStatus = 'Ordered' | 'Scheduled' | 'Performed' | 'Reported' | 'Cancelled';
export type DiagnosticOrderPriority = 'Routine' | 'Urgent' | 'Emergency';

export interface DiagnosticOrderDto {
  id: string;
  patientId: string;
  consultationId: string | null;
  type: DiagnosticOrderType;
  name: string;
  bodySite: string | null;
  clinicalIndication: string;
  priority: DiagnosticOrderPriority;
  status: DiagnosticOrderStatus;
  orderedByUserId: string;
  orderedAtUtc: string;
  scheduledByUserId: string | null;
  scheduledAtUtc: string | null;
  performedByUserId: string | null;
  performedAtUtc: string | null;
  report: string | null;
  reportedByUserId: string | null;
  reportedAtUtc: string | null;
  cancelledByUserId: string | null;
  cancelledAtUtc: string | null;
  cancellationReason: string | null;
}

export interface RaiseFlagInput {
  type: 'Allergy' | 'Warning' | 'Info' | 'Medical';
  message: string;
}

export interface CreateDiagnosticOrderInput {
  patientId: string;
  consultationId?: string | null;
  type: DiagnosticOrderType;
  name: string;
  bodySite?: string | null;
  clinicalIndication: string;
  priority: DiagnosticOrderPriority;
}
