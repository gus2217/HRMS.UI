// ============================================================
// Laboratory feature types (mirror backend DTOs).
// ============================================================

export interface LabTestItemDto {
  id: string;
  testCode: string;
  testName: string;
  status: string;
  resultValue: string | null;
  resultUnit: string | null;
  referenceRange: string | null;
  isAbnormal: boolean | null;
}

export interface LabOrderDetail {
  id: string;
  patientId: string;
  consultationId: string;
  orderedByUserId: string;
  status: string;
  orderedAtUtc: string;
  tests: LabTestItemDto[];
}
