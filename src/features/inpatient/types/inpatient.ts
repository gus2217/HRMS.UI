// ============================================================
// Inpatient feature types (mirror backend DTOs).
// ============================================================

export type WardType =
  | 'General'
  | 'Maternity'
  | 'Pediatric'
  | 'Surgical'
  | 'Icu'
  | 'Isolation'
  | 'Private'
  | 'Recovery';

export interface WardDto {
  id: string;
  name: string;
  type: WardType;
  totalBeds: number;
  isActive: boolean;
}

export interface WardNoteDto {
  content: string;
  authorUserId: string;
  recordedAtUtc: string;
  authorName: string | null;
}

export interface WardRecordAttachmentDto {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedByUserId: string;
  uploadedAtUtc: string;
  uploadedByName: string | null;
}

export interface WardMedicalRecordDto {
  id: string;
  recordedByUserId: string;
  recordedAtUtc: string;
  temperatureCelsius: number | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  pulseRate: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  weightKg: number | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  isComplete: boolean;
  attachments: WardRecordAttachmentDto[];
  recordedByName: string | null;
}

export interface AdmissionDetail {
  id: string;
  patientId: string;
  admittingClinicianUserId: string;
  wardId: string;
  wardName: string;
  bedNumber: string;
  admittingDiagnosis: string | null;
  attendingClinicianUserId: string | null;
  status: string;
  admittedAtUtc: string;
  dischargedAtUtc: string | null;
  notes: WardNoteDto[];
  medicalRecords: WardMedicalRecordDto[];
  hasCompleteMedicalRecord: boolean;
  admittingClinicianName: string | null;
  attendingClinicianName: string | null;
}

export interface WardOccupancyDto {
  wardId: string;
  wardName: string;
  occupiedBeds: number;
  totalBeds: number;
}

export interface AdmissionListItem {
  id: string;
  patientId: string;
  patientNumber: string;
  patientName: string;
  wardId: string;
  wardName: string;
  bedNumber: string;
  status: string;
  admittedAtUtc: string;
  dischargedAtUtc: string | null;
}
