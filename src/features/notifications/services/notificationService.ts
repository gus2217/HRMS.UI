// ============================================================
// notificationService.ts
// Location: src/features/notifications/services/notificationService.ts
// ============================================================

import { http, type PagedResult } from '@/lib/apiClient';
import type { UserNotificationDto, UnreadNotificationCountDto } from '../types/notifications';

export const NotificationService = {
  list(pageNumber = 1, pageSize = 30, unreadOnly = false): Promise<PagedResult<UserNotificationDto>> {
    const q = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize), unreadOnly: String(unreadOnly) });
    return http.get<PagedResult<UserNotificationDto>>(`/notifications?${q.toString()}`);
  },

  unreadCount(): Promise<UnreadNotificationCountDto> {
    return http.get<UnreadNotificationCountDto>('/notifications/unread-count');
  },

  markRead(id: string): Promise<UserNotificationDto> {
    return http.post<UserNotificationDto>(`/notifications/${id}/read`);
  },

  markAllRead(): Promise<UnreadNotificationCountDto> {
    return http.post<UnreadNotificationCountDto>('/notifications/read-all');
  },
};
