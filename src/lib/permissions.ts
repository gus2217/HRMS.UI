// ============================================================
// Role → permission mapping.
// Backend permission codes (from Identity.Permissions + seed):
//   Patient.*, Clinical.*, Laboratory.*, Pharmacy.*, Inventory.*,
//   Billing.*, Identity.*
// The Administrator role holds every permission on the backend;
// the UI mirrors that here. Route guards and UI elements must
// check permissions — never roles directly.
// ============================================================

export const PERMISSIONS = {
  VIEW_DASHBOARD: 'Dashboard.View',
  PATIENT_VIEW: 'Patient.View',
  PATIENT_REGISTER: 'Patient.Register',
  PATIENT_UPDATE: 'Patient.Update',
  CLINICAL_VIEW: 'Clinical.View',
  CLINICAL_CONSULT: 'Clinical.Consult',
  CLINICAL_RECORD_DIAGNOSIS: 'Clinical.RecordDiagnosis',
  LABORATORY_ORDER: 'Laboratory.Order',
  LABORATORY_RECORD_RESULT: 'Laboratory.RecordResult',
  PHARMACY_DISPENSE: 'Pharmacy.Dispense',
  INVENTORY_RECEIVE: 'Inventory.Receive',
  INVENTORY_ADJUST: 'Inventory.Adjust',
  BILLING_VIEW: 'Billing.View',
  BILLING_ISSUE_INVOICE: 'Billing.IssueInvoice',
  BILLING_RECORD_PAYMENT: 'Billing.RecordPayment',
  IDENTITY_USER_VIEW: 'Identity.User.View',
  IDENTITY_USER_REGISTER: 'Identity.User.Register',
  IDENTITY_USER_ASSIGN_ROLE: 'Identity.User.AssignRole',
  IDENTITY_USER_SUSPEND: 'Identity.User.Suspend',
  IDENTITY_ROLE_VIEW: 'Identity.Role.View',
  IDENTITY_ROLE_MANAGE: 'Identity.Role.Manage',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/** Backend system roles (seed). */
export type SystemRole =
  | 'Administrator'
  | 'Doctor'
  | 'Nurse'
  | 'Receptionist'
  | 'LabTechnician'
  | 'Pharmacist'
  | 'StoreKeeper'
  | 'Accountant'
  | 'Cashier'
  | 'RecordsOfficer'
  | 'ITSupport'

/** Matches the backend role seed grants (DbInitializer). */
export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  Administrator: Object.values(PERMISSIONS),
  Doctor: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.PATIENT_REGISTER,
    PERMISSIONS.CLINICAL_VIEW,
    PERMISSIONS.CLINICAL_CONSULT,
    PERMISSIONS.CLINICAL_RECORD_DIAGNOSIS,
    PERMISSIONS.LABORATORY_ORDER,
    PERMISSIONS.PHARMACY_DISPENSE,
  ],
  Nurse: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.PATIENT_REGISTER,
    PERMISSIONS.CLINICAL_VIEW,
    PERMISSIONS.LABORATORY_ORDER,
  ],
  Receptionist: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.PATIENT_REGISTER,
    PERMISSIONS.PATIENT_UPDATE,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_ISSUE_INVOICE,
  ],
  LabTechnician: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.LABORATORY_ORDER,
    PERMISSIONS.LABORATORY_RECORD_RESULT,
  ],
  Pharmacist: [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.PATIENT_VIEW, PERMISSIONS.PHARMACY_DISPENSE],
  StoreKeeper: [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.INVENTORY_RECEIVE, PERMISSIONS.INVENTORY_ADJUST],
  Accountant: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_ISSUE_INVOICE,
    PERMISSIONS.BILLING_RECORD_PAYMENT,
  ],
  Cashier: [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.BILLING_VIEW, PERMISSIONS.BILLING_RECORD_PAYMENT],
  RecordsOfficer: [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.PATIENT_VIEW, PERMISSIONS.PATIENT_UPDATE],
  ITSupport: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.IDENTITY_USER_VIEW,
    PERMISSIONS.IDENTITY_USER_REGISTER,
    PERMISSIONS.IDENTITY_USER_ASSIGN_ROLE,
    PERMISSIONS.IDENTITY_USER_SUSPEND,
    PERMISSIONS.IDENTITY_ROLE_VIEW,
    PERMISSIONS.IDENTITY_ROLE_MANAGE,
  ],
}

const SYSTEM_ROLES = new Set(Object.keys(ROLE_PERMISSIONS))

export function isSystemRole(role: string): role is SystemRole {
  return SYSTEM_ROLES.has(role)
}

/**
 * Resolve the effective permission set for a user's roles.
 * Unknown roles (e.g. future custom roles) contribute nothing but are safe.
 */
export function permissionsForRoles(roles: string[]): Set<Permission> {
  const set = new Set<Permission>()
  for (const role of roles) {
    if (isSystemRole(role)) {
      for (const p of ROLE_PERMISSIONS[role]) set.add(p)
    }
  }
  return set
}

export function hasPermission(perms: Set<Permission>, permission: Permission): boolean {
  return perms.has(permission)
}
