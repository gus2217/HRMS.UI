// ============================================================
// Role → permission mapping, mirroring the backend seed grants
// (Jacana.HRMS DbInitializer) and the backend permission catalog
// (Jacana.Identity.Application.Permissions). The Administrator role
// holds every permission on the backend; the UI mirrors that here.
// Route guards and UI elements must check permissions — never roles
// directly. There is intentionally no "Dashboard.View" — the backend
// dashboard endpoint requires Identity.User.View, so the dashboard
// nav/route uses that permission.
// ============================================================

export const PERMISSIONS = {
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
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

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
  | 'ITSupport';

/** Matches the backend role seed grants (DbInitializer). */
export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  Administrator: Object.values(PERMISSIONS),
  Doctor: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.PATIENT_REGISTER,
    PERMISSIONS.CLINICAL_VIEW,
    PERMISSIONS.CLINICAL_CONSULT,
    PERMISSIONS.CLINICAL_RECORD_DIAGNOSIS,
    PERMISSIONS.LABORATORY_ORDER,
    PERMISSIONS.PHARMACY_DISPENSE,
  ],
  Nurse: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.PATIENT_REGISTER,
    PERMISSIONS.CLINICAL_VIEW,
    PERMISSIONS.CLINICAL_CONSULT, // triage, begin phase, clinical notes (backend grant)
    PERMISSIONS.LABORATORY_ORDER,
  ],
  Receptionist: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.PATIENT_REGISTER,
    PERMISSIONS.PATIENT_UPDATE,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_ISSUE_INVOICE,
  ],
  LabTechnician: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.LABORATORY_ORDER,
    PERMISSIONS.LABORATORY_RECORD_RESULT,
  ],
  Pharmacist: [PERMISSIONS.PATIENT_VIEW, PERMISSIONS.PHARMACY_DISPENSE],
  StoreKeeper: [PERMISSIONS.INVENTORY_RECEIVE, PERMISSIONS.INVENTORY_ADJUST],
  Accountant: [
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_ISSUE_INVOICE,
    PERMISSIONS.BILLING_RECORD_PAYMENT,
  ],
  Cashier: [PERMISSIONS.BILLING_VIEW, PERMISSIONS.BILLING_RECORD_PAYMENT],
  RecordsOfficer: [PERMISSIONS.PATIENT_VIEW, PERMISSIONS.PATIENT_UPDATE],
  ITSupport: [
    PERMISSIONS.IDENTITY_USER_VIEW,
    PERMISSIONS.IDENTITY_USER_REGISTER,
    PERMISSIONS.IDENTITY_USER_ASSIGN_ROLE,
    PERMISSIONS.IDENTITY_USER_SUSPEND,
    PERMISSIONS.IDENTITY_ROLE_VIEW,
    PERMISSIONS.IDENTITY_ROLE_MANAGE,
  ],
};

const SYSTEM_ROLES = new Set(Object.keys(ROLE_PERMISSIONS));

export function isSystemRole(role: string): role is SystemRole {
  return SYSTEM_ROLES.has(role);
}

/** Resolve the effective permission set for a user's roles. */
export function permissionsForRoles(roles: string[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const role of roles) {
    if (isSystemRole(role)) {
      for (const p of ROLE_PERMISSIONS[role]) set.add(p);
    }
  }
  return set;
}

export function hasPermission(perms: Set<Permission>, permission: Permission): boolean {
  return perms.has(permission);
}

/** True when the user holds at least one of the given permissions. */
export function hasAnyPermission(perms: Set<Permission>, required: Permission[]): boolean {
  return required.some((p) => perms.has(p));
}

/** Permissions that unlock the Reports page (mirrors backend report endpoint grants). */
export const REPORT_PERMISSIONS: Permission[] = [
  PERMISSIONS.IDENTITY_USER_VIEW, // registrations + dashboard reports
  PERMISSIONS.BILLING_VIEW, // revenue-by-service + SHA claims
  PERMISSIONS.INVENTORY_RECEIVE, // stock levels
  PERMISSIONS.CLINICAL_VIEW, // clinician workload
];

/** First page a user should land on, in backend-mirroring priority order. */
export function defaultPathFor(perms: Set<Permission>): string {
  const candidates: { path: string; permission: Permission }[] = [
    { path: '/patients', permission: PERMISSIONS.PATIENT_VIEW },
    { path: '/consultations', permission: PERMISSIONS.CLINICAL_VIEW },
    { path: '/billing', permission: PERMISSIONS.BILLING_VIEW },
    { path: '/pharmacy', permission: PERMISSIONS.PHARMACY_DISPENSE },
    { path: '/lab', permission: PERMISSIONS.LABORATORY_ORDER },
    { path: '/wards', permission: PERMISSIONS.CLINICAL_VIEW },
    { path: '/inventory', permission: PERMISSIONS.INVENTORY_RECEIVE },
  ];
  for (const c of candidates) {
    if (hasPermission(perms, c.permission)) return c.path;
  }
  if (hasAnyPermission(perms, REPORT_PERMISSIONS)) return '/reports';
  if (hasPermission(perms, PERMISSIONS.IDENTITY_USER_VIEW)) return '/audit';
  return '/patients';
}
