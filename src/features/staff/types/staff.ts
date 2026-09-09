// ============================================================
// Staff feature types (mirror backend identity DTOs).
// ============================================================

export interface StaffUserListItemDto {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
  lastLoginAtUtc: string | null;
  roles: string[];
  directPermissions: string[];
}

export interface StaffUserDetailDto extends StaffUserListItemDto {
  effectivePermissions: string[];
}

export interface CreateStaffRequest {
  fullName: string;
  email: string;
  phone: string;
  roleNames: string[];
  permissionCodes: string[];
}

export interface CreatedStaffAccountDto {
  user: StaffUserDetailDto;
  /** One-time default password — shown to the admin once, never returned again. */
  temporaryPassword: string;
}

export interface UpdateUserAccessRequest {
  roleNames: string[];
  permissionCodes: string[];
}

export interface ResetPasswordResultDto {
  temporaryPassword: string;
}

export interface RoleDto {
  id: string;
  name: string;
  permissions: string[];
}

export interface PermissionDto {
  id: string;
  code: string;
  description: string;
}

export type UserStatus = 'Active' | 'Suspended' | 'Locked' | 'Deactivated';
