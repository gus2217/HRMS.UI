// ============================================================
// Inpatient feature types (mirror backend DTOs).
// ============================================================

export interface WardNoteDto {
  content: string;
  authorUserId: string;
  recordedAtUtc: string;
}

export interface AdmissionDetail {
  id: string;
  patientId: string;
  admittingClinicianUserId: string;
  wardName: string;
  bedNumber: string;
  status: string;
  admittedAtUtc: string;
  dischargedAtUtc: string | null;
  notes: WardNoteDto[];
}

export interface WardOccupancyDto {
  wardName: string;
  occupiedBeds: number;
  totalBeds: number;
}

export interface AdmissionListItem {
  id: string;
  patientId: string;
  patientNumber: string;
  patientName: string;
  wardName: string;
  bedNumber: string;
  status: string;
  admittedAtUtc: string;
  dischargedAtUtc: string | null;
}
