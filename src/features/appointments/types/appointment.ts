// ============================================================
// Appointment feature types (mirror backend DTOs).
// ============================================================

export type AppointmentStatus = 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled' | 'NoShow';
export type AppointmentType = 'Consultation' | 'FollowUp' | 'CheckUp' | 'Review' | 'Procedure' | 'Other';
export type RecurrencePattern = 'None' | 'Daily' | 'Weekly' | 'Monthly';
export type AppointmentRequestStatus = 'Pending' | 'Approved' | 'Declined' | 'Scheduled';

export interface Appointment {
  id: string;
  patientId: string;
  patientNumber: string;
  patientName: string;
  clinicType: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledAtUtc: string;
  durationMinutes: number;
  reason: string | null;
  recurrenceGroupId: string | null;
  recurrencePattern: RecurrencePattern;
  createdByUserId: string;
  createdAtUtc: string;
  consultationId: string | null;
  startedAtUtc: string | null;
  completedAtUtc: string | null;
}

export interface AppointmentRequest {
  id: string;
  patientId: string;
  patientNumber: string;
  patientName: string;
  clinicType: string;
  reason: string;
  notes: string | null;
  preferredDate: string | null;
  status: AppointmentRequestStatus;
  requestedByUserId: string;
  requestedByName: string;
  requestedAtUtc: string;
  approvedByUserId: string | null;
  approvedByName: string | null;
  approvedAtUtc: string | null;
  appointmentId: string | null;
}

export interface StartAppointmentResponse {
  appointment: Appointment;
  consultationId: string;
}
