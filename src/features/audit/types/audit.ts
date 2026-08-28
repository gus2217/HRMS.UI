// ============================================================
// Audit feature types (mirror backend DTOs).
// ============================================================

export interface AuditLogEntryDto {
  id: string;
  facilityId: string;
  entityType: string;
  entityId: string;
  action: string;
  performedByUserId: string;
  performedAtUtc: string;
  beforeValuesJson: string | null;
  afterValuesJson: string | null;
}
