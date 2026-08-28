// ============================================================
// Pharmacy feature types (mirror backend DTOs).
// ============================================================

export interface PrescriptionItemDto {
  id: string;
  drugId: string;
  dosageInstructions: string;
  quantityPrescribed: number;
  quantityDispensed: number;
  status: string;
}

export interface PrescriptionDetail {
  id: string;
  patientId: string;
  consultationId: string;
  prescribedByUserId: string;
  status: string;
  prescribedAtUtc: string;
  items: PrescriptionItemDto[];
}

export interface PrescriptionListItem {
  id: string;
  patientId: string;
  patientNumber: string;
  patientName: string;
  prescribedByUserId: string;
  status: string;
  prescribedAtUtc: string;
  itemCount: number;
}
