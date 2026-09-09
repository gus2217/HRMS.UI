// ============================================================
// staffService.ts
// Location: src/features/staff/services/staffService.ts
//
// Staff-management API client. Every call is permission-gated on
// the backend (Identity.User.* / Identity.Role.*).
// ============================================================

import { http, type PagedResult } from '@/lib/apiClient';
import type {
  CreatedStaffAccountDto,
  CreateStaffRequest,
  PermissionDto,
  ResetPasswordResultDto,
  RoleDto,
  StaffUserDetailDto,
  StaffUserListItemDto,
  UpdateUserAccessRequest,
} from '../types/staff';

export const StaffService = {
  /** Paged staff directory, searchable by name / email / phone. */
  list(pageNumber = 1, pageSize = 20, search?: string): Promise<PagedResult<StaffUserListItemDto>> {
    const q = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) });
    if (search) q.set('search', search);
    return http.get<PagedResult<StaffUserListItemDto>>(`/identity/users?${q.toString()}`);
  },

  detail(id: string): Promise<StaffUserDetailDto> {
    return http.get<StaffUserDetailDto>(`/identity/users/${id}`);
  },

  /** Create a staff account. Response carries the one-time default password. */
  create(request: CreateStaffRequest): Promise<CreatedStaffAccountDto> {
    return http.post<CreatedStaffAccountDto>('/identity/users', request);
  },

  /** Atomic save: replace the user's roles AND direct permission grants. */
  updateAccess(id: string, request: UpdateUserAccessRequest): Promise<StaffUserDetailDto> {
    return http.put<StaffUserDetailDto>(`/identity/users/${id}/access`, request);
  },

  suspend(id: string): Promise<StaffUserDetailDto> {
    return http.post<StaffUserDetailDto>(`/identity/users/${id}/suspend`);
  },

  reactivate(id: string): Promise<StaffUserDetailDto> {
    return http.post<StaffUserDetailDto>(`/identity/users/${id}/reactivate`);
  },

  /** Admin reset — response carries the new one-time temporary password. */
  resetPassword(id: string): Promise<ResetPasswordResultDto> {
    return http.post<ResetPasswordResultDto>(`/identity/users/${id}/reset-password`);
  },

  roles(): Promise<RoleDto[]> {
    return http.get<RoleDto[]>('/identity/roles');
  },

  permissions(): Promise<PermissionDto[]> {
    return http.get<PermissionDto[]>('/identity/permissions');
  },
};
