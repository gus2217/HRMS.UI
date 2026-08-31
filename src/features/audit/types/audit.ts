// ============================================================
// Audit feature types (mirror backend DTOs).
// ============================================================

export interface AuditLogEntryDto {
  id: string;
  facilityId: string;
  entityType: string;
  entityId: string;
  entityName: string | null;
  action: string;
  performedByUserId: string;
  performedByName: string | null;
  performedAtUtc: string;
  beforeValuesJson: string | null;
  afterValuesJson: string | null;
}
