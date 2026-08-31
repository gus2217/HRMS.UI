// ============================================================
// Queue feature types (mirror backend DTOs).
// ============================================================

export type QueuePriority = 'Routine' | 'Urgent' | 'Emergency';
export type QueueStatus = 'Waiting' | 'Accepted' | 'Completed' | 'Cancelled';

export interface QueueEntry {
  id: string;
  patientId: string;
  patientNumber: string;
  patientName: string;
  clinicType: string;
  priority: QueuePriority;
  status: QueueStatus;
  queueNumber: string;
  notes: string | null;
  requestedByUserId: string;
  requestedAtUtc: string;
  acceptedByUserId: string | null;
  acceptedAtUtc: string | null;
  consultationId: string | null;
}

export interface AcceptQueueResponse {
  queueEntry: QueueEntry;
  consultationId: string;
}
