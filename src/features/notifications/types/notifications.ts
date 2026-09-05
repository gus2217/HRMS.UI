// ============================================================
// Notification feature types (mirror backend DTOs).
// ============================================================

export type NotificationCategory =
  | 'ConsultationRequested'
  | 'AppointmentRequested'
  | 'LabResultReady'
  | 'DiagnosticResultReady'
  | 'PrescriptionInitiated'
  | 'PatientAdmitted'
  | 'PatientDischarged'
  | 'PatientTransferred'
  | 'ReferralCreated'
  | 'InvoiceIssued'
  | 'System';

export interface NotificationPreferenceDto {
  category: NotificationCategory;
  inAppEnabled: boolean;
  smsEnabled: boolean;
}

export interface UserNotificationDto {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  entityType: string;
  entityId: string | null;
  /** Frontend route to open when the recipient acts on this notification. */
  link: string | null;
  isRead: boolean;
  createdAtUtc: string;
}

export interface UnreadNotificationCountDto {
  unreadCount: number;
}
