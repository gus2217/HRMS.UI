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
  isRead: boolean;
  createdAtUtc: string;
}

export interface UnreadNotificationCountDto {
  unreadCount: number;
}
