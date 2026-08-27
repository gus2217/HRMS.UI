// ============================================================
// Jacana HRMS API client — contracts verified against the live
// backend (all endpoints under /api/v1).
// Auth is bearer-token based: access token in memory, refresh
// token in localStorage so a reload can silently refresh.
// The `X-Auth-Mode: bearer` header opts the SPA out of the
// cookie/CSRF scheme on the backend.
// ============================================================

import { API_BASE } from '@/config'

let accessToken: string | null = null

const REFRESH_KEY = 'jacana.refreshToken'

export function setTokens(access: string, refresh: string) {
  accessToken = access
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  accessToken = null
  localStorage.removeItem(REFRESH_KEY)
}

export function getAccessToken(): string | null {
  return accessToken
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface ApiProblem {
  error?: string
  title?: string
  detail?: string
  duplicateCandidates?: unknown[]
}

/** Single-flight refresh so concurrent 401s trigger one refresh. */
let refreshInFlight: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  const refresh = localStorage.getItem(REFRESH_KEY)
  if (!refresh) return false

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Mode': 'bearer',
          },
          body: JSON.stringify({ refreshToken: refresh }),
        })
        if (!res.ok) return false
        const data = (await res.json()) as { accessToken?: string; refreshToken?: string }
        if (!data.accessToken) return false
        accessToken = data.accessToken
        if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken)
        return true
      } catch {
        return false
      } finally {
        refreshInFlight = null
      }
    })()
  }
  return refreshInFlight
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const doFetch = () =>
    fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Mode': 'bearer',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(options.headers ?? {}),
      },
    })

  let res = await doFetch()

  // On 401, try a silent refresh once, then retry.
  if (res.status === 401 && (await refreshAccessToken())) {
    res = await doFetch()
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const problem = (await res.json()) as ApiProblem
      message = problem.detail ?? problem.error ?? problem.title ?? message
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

const get = <T>(path: string) => request<T>(path)
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })
const put = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(body) })

// ─── Domain types (mirror backend DTOs) ─────────────────────────────

export interface LoginResponse {
  userId: string
  fullName: string
  email: string
  roles: string[]
  accessToken: string | null
  refreshToken: string | null
  requiresTwoFactor: boolean
}

export interface RefreshResponse {
  accessToken: string | null
  refreshToken: string | null
}

export interface UserResponse {
  id: string
  fullName: string
  email: string
  phone: string
  status: string
  twoFactorEnabled: boolean
  lastLoginAtUtc: string | null
  roles: string[]
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  pageNumber: number
  pageSize: number
}

export interface PatientSummary {
  id: string
  patientNumber: string
  fullName: string
  dateOfBirth: string
  phone: string | null
  lastVisitDate: string | null
}

export interface AllergyDto {
  substance: string
  severity: string
  notes: string | null
}

export interface ConsentDto {
  type: string
  granted: boolean
  recordedAtUtc: string
}

export interface NextOfKinDto {
  fullName: string
  relationship: string
  phone: string | null
}

export interface PatientDetail {
  id: string
  patientNumber: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: string
  maritalStatus: string
  phone: string | null
  shaNumber: string | null
  county: string
  subCounty: string | null
  ward: string | null
  line1: string | null
  status: string
  allergies: AllergyDto[]
  consents: ConsentDto[]
  nextOfKin: NextOfKinDto[]
}

export interface DuplicateCandidate {
  id: string
  patientNumber: string
  fullName: string
  dateOfBirth: string
  nationalId: string | null
}

export interface RegisterPatientResponse {
  id: string
  patientNumber: string
  duplicateCandidates: DuplicateCandidate[]
}

export interface DiagnosisDto {
  icdCode: string
  description: string
  isPrimary: boolean
}

export interface ClinicalNoteDto {
  content: string
  authorUserId: string
  recordedAtUtc: string
}

export interface TriageDataDto {
  temperatureCelsius: number | null
  bloodPressure: string | null
  pulseRate: number | null
  respiratoryRate: number | null
  weightKg: number | null
}

export interface ConsultationDetail {
  id: string
  patientId: string
  clinicianUserId: string
  status: string
  startedAtUtc: string
  completedAtUtc: string | null
  triage: TriageDataDto | null
  diagnoses: DiagnosisDto[]
  notes: ClinicalNoteDto[]
}

export interface ConsultationSummary {
  id: string
  patientId: string
  clinicianUserId: string
  status: string
  startedAtUtc: string
  completedAtUtc: string | null
}

export interface PatientClinicalHistory {
  patientId: string
  consultations: ConsultationSummary[]
  diagnoses: DiagnosisDto[]
  notes: ClinicalNoteDto[]
}

export interface LabTestItemDto {
  id: string
  testCode: string
  testName: string
  status: string
  resultValue: string | null
  resultUnit: string | null
  referenceRange: string | null
  isAbnormal: boolean | null
}

export interface LabOrderDetail {
  id: string
  patientId: string
  consultationId: string
  orderedByUserId: string
  status: string
  orderedAtUtc: string
  tests: LabTestItemDto[]
}

export interface PrescriptionItemDto {
  id: string
  drugId: string
  dosageInstructions: string
  quantityPrescribed: number
  quantityDispensed: number
  status: string
}

export interface PrescriptionDetail {
  id: string
  patientId: string
  consultationId: string
  prescribedByUserId: string
  status: string
  prescribedAtUtc: string
  items: PrescriptionItemDto[]
}

export interface DrugCatalogDto {
  id: string
  code: string
  name: string
  form: string
  unitPrice: number
  reorderLevel: number
  status: string
}

export interface StockLevelDto {
  drugId: string
  drugCode: string
  drugName: string
  quantityOnHand: number
  reorderLevel: number
}

/** /reports/stock-levels projection — no reorder level. */
export interface StockLevelReportDto {
  drugId: string
  drugCode: string
  drugName: string
  quantityOnHand: number
}

export interface LowStockAlertDto {
  drugId: string
  drugCode: string
  drugName: string
  quantityOnHand: number
  reorderLevel: number
}

export interface InvoiceLineDto {
  id: string
  serviceCode: string
  description: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface InvoiceDetail {
  id: string
  patientId: string
  consultationId: string | null
  status: string
  totalAmount: number
  primaryPaymentMethod: string | null
  lines: InvoiceLineDto[]
}

export interface PaymentReceiptDto {
  paymentId: string
  invoiceId: string
  amountPaid: number
  method: string
  providerTransactionReference: string
  status: string
}

export interface ShaClaimSubmissionDto {
  shaClaimId: string
  invoiceId: string
  shaClaimReference: string
  status: string
}

export interface WardNoteDto {
  content: string
  authorUserId: string
  recordedAtUtc: string
}

export interface AdmissionDetail {
  id: string
  patientId: string
  admittingClinicianUserId: string
  wardName: string
  bedNumber: string
  status: string
  admittedAtUtc: string
  dischargedAtUtc: string | null
  notes: WardNoteDto[]
}

export interface WardOccupancyDto {
  wardName: string
  occupiedBeds: number
  totalBeds: number
}

export interface AuditLogEntryDto {
  id: string
  facilityId: string
  entityType: string
  entityId: string
  action: string
  performedByUserId: string
  performedAtUtc: string
  beforeValuesJson: string | null
  afterValuesJson: string | null
}

export interface DailyRegistrationsReport {
  date: string
  registrations: number
}

export interface RevenueByServiceReport {
  serviceCode: string
  description: string
  totalRevenue: number
}

export interface ShaClaimStatusReport {
  status: string
  claimCount: number
  totalAmount: number
}

export interface ClinicianWorkloadReport {
  clinicianUserId: string
  consultationCount: number
}

export interface FacilityDashboardSummary {
  totalPatients: number
  openAdmissions: number
  totalRevenue: number
  pendingLabOrders: number
  lowStockItems: number
}

// ─── Endpoint functions — grouped by module ─────────────────────────

export const authApi = {
  login: (email: string, password: string, totpCode?: string) =>
    post<LoginResponse>('/auth/login', { email, password, totpCode }),

  refresh: (refreshToken: string) =>
    post<RefreshResponse>('/auth/refresh', { refreshToken }),

  register: (input: { fullName: string; email: string; phone: string; password: string; roleNames?: string[] }) =>
    post<UserResponse>('/auth/register', input),

  csrf: () => get<{ csrfToken: string }>('/auth/csrf'),
}

export const patientApi = {
  register: (input: {
    firstName: string
    lastName: string
    dateOfBirth: string
    gender: string
    maritalStatus: string
    phone: string
    nationalId?: string | null
    shaNumber?: string | null
    county: string
    subCounty?: string | null
    ward?: string | null
    line1?: string | null
    nextOfKin?: { fullName: string; relationship: string; phone: string | null }[]
  }) => post<RegisterPatientResponse>('/patients', input),

  search: (search?: string, pageNumber = 1, pageSize = 50) => {
    const q = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) })
    if (search) q.set('search', search)
    return get<PagedResult<PatientSummary>>(`/patients?${q.toString()}`)
  },

  detail: (id: string) => get<PatientDetail>(`/patients/${id}`),

  updateDemographics: (
    id: string,
    input: {
      firstName: string
      lastName: string
      dateOfBirth: string
      gender: string
      maritalStatus: string
      phone: string
      county: string
      subCounty?: string | null
      ward?: string | null
      line1?: string | null
    },
  ) => put<PatientDetail>(`/patients/${id}/demographics`, input),

  addAllergy: (id: string, input: { substance: string; severity: string; notes?: string | null }) =>
    post<PatientDetail>(`/patients/${id}/allergies`, input),

  recordConsent: (id: string, input: { type: string; granted: boolean }) =>
    post<PatientDetail>(`/patients/${id}/consents`, input),
}

export const consultationApi = {
  start: (patientId: string, clinicianUserId: string) =>
    post<ConsultationDetail>('/consultations', { patientId, clinicianUserId }),

  detail: (id: string) => get<ConsultationDetail>(`/consultations/${id}`),

  recordTriage: (
    id: string,
    input: {
      temperatureCelsius?: number | null
      bloodPressure?: string | null
      pulseRate?: number | null
      respiratoryRate?: number | null
      weightKg?: number | null
    },
  ) => post<ConsultationDetail>(`/consultations/${id}/triage`, input),

  /** Advances Triaged → AwaitingClinician → InConsultation (backend workflow). */
  begin: (id: string) =>
    post<ConsultationDetail>(`/consultations/${id}/begin`),

  recordDiagnosis: (id: string, input: { icdCode: string; description: string; isPrimary: boolean }) =>
    post<ConsultationDetail>(`/consultations/${id}/diagnoses`, input),

  addNote: (id: string, content: string) =>
    post<ConsultationDetail>(`/consultations/${id}/notes`, { content }),

  complete: (id: string) => post<ConsultationDetail>(`/consultations/${id}/complete`),

  history: (patientId: string) => get<PatientClinicalHistory>(`/patients/${patientId}/clinical-history`),
}

export const inventoryApi = {
  createDrug: (input: { code: string; name: string; form: string; unitPrice: number; reorderLevel: number }) =>
    post<DrugCatalogDto>('/inventory/drugs', input),

  receiveStock: (input: {
    drugId: string
    batchNumber: string
    quantity: number
    expiryDate: string
    unitCost: number
    reference?: string | null
  }) => post<{ stockBatchId: string; batchNumber: string; quantityOnHand: number }>('/inventory/stock/receive', input),

  adjustStock: (input: { stockBatchId: string; newQuantity: number; reason?: string | null }) =>
    post<{ stockBatchId: string; batchNumber: string; quantityOnHand: number }>('/inventory/stock/adjust', input),

  stockLevels: () => get<StockLevelDto[]>('/inventory/stock-levels'),

  lowStock: () => get<LowStockAlertDto[]>('/inventory/low-stock'),
}

export const pharmacyApi = {
  createPrescription: (input: {
    patientId: string
    consultationId: string
    items: { drugId: string; dosageInstructions: string; quantityPrescribed: number }[]
  }) => post<PrescriptionDetail>('/pharmacy/prescriptions', input),

  detail: (id: string) => get<PrescriptionDetail>(`/pharmacy/prescriptions/${id}`),

  dispense: (input: { prescriptionId: string; prescriptionItemId: string; quantity: number }) =>
    post<{ dispenseRecordId: string; prescriptionItemId: string; quantityDispensed: number }>('/pharmacy/dispense', input),
}

export const labApi = {
  createOrder: (input: {
    patientId: string
    consultationId: string
    tests: { testCode: string; testName: string }[]
  }) => post<LabOrderDetail>('/lab/orders', input),

  detail: (id: string) => get<LabOrderDetail>(`/lab/orders/${id}`),

  recordResult: (
    id: string,
    input: {
      testItemId: string
      resultValue?: string | null
      resultUnit?: string | null
      referenceRange?: string | null
      isAbnormal?: boolean | null
    },
  ) => post<LabOrderDetail>(`/lab/orders/${id}/results`, input),
}

export const billingApi = {
  issueInvoice: (input: {
    patientId: string
    consultationId?: string | null
    primaryPaymentMethod?: string | null
    lines: { serviceCode: string; description: string; quantity: number; unitPrice: number }[]
  }) => post<InvoiceDetail>('/billing/invoices', input),

  detail: (id: string) => get<InvoiceDetail>(`/billing/invoices/${id}`),

  recordPayment: (input: {
    invoiceId: string
    amountPaid: number
    method: string
    providerTransactionReference: string
  }) => post<PaymentReceiptDto>('/billing/payments', input),

  submitShaClaim: (invoiceId: string, shaClaimReference: string) =>
    post<ShaClaimSubmissionDto>('/billing/sha/claims', { invoiceId, shaClaimReference }),
}

export const inpatientApi = {
  admit: (input: {
    patientId: string
    admittingClinicianUserId: string
    wardName: string
    bedNumber: string
  }) => post<AdmissionDetail>('/inpatient/admissions', input),

  detail: (id: string) => get<AdmissionDetail>(`/inpatient/admissions/${id}`),

  discharge: (id: string) => post<AdmissionDetail>(`/inpatient/admissions/${id}/discharge`),

  addNote: (id: string, content: string) =>
    post<AdmissionDetail>(`/inpatient/admissions/${id}/notes`, { content }),

  wardOccupancy: () => get<WardOccupancyDto[]>('/inpatient/ward-occupancy'),
}

export const auditApi = {
  search: (entityType?: string, pageNumber = 1, pageSize = 100) => {
    const q = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) })
    if (entityType) q.set('entityType', entityType)
    return get<PagedResult<AuditLogEntryDto>>(`/audit?${q.toString()}`)
  },
}

export const reportApi = {
  registrations: (from: string, to: string) => {
    const q = new URLSearchParams({ from, to })
    return get<DailyRegistrationsReport[]>(`/reports/registrations?${q.toString()}`)
  },
  revenueByService: () => get<RevenueByServiceReport[]>('/reports/revenue-by-service'),
  stockLevels: () => get<StockLevelReportDto[]>('/reports/stock-levels'),
  shaClaims: () => get<ShaClaimStatusReport[]>('/reports/sha-claims'),
  clinicianWorkload: () => get<ClinicianWorkloadReport[]>('/reports/clinician-workload'),
  dashboard: () => get<FacilityDashboardSummary>('/reports/dashboard'),
}
