// ============================================================
// Notification feature types (mirror backend DTOs).
// ============================================================

export type NotificationCategory =
  | 'ConsultationRequested'
  | 'AppointmentRequested'
  | 'LabResultReady'
  | 'PrescriptionInitiated'
  | 'PatientAdmitted'
  | 'PatientDischarged'
  | 'ReferralCreated'
  | 'System';

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
