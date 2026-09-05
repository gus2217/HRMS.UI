// ============================================================
// NotificationBell.tsx
// Location: src/features/notifications/components/NotificationBell.tsx
//
// Bell icon with unread badge + dropdown feed. Receives live
// notifications over SignalR (instant badge/feed refresh), polls
// every 30s as a fallback, and offers per-category delivery
// preferences (in-app now, SMS-ready).
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Loader2, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { NotificationService } from '../services/notificationService';
import { subscribeToNotifications } from '../services/notificationHub';
import type { UserNotificationDto } from '../types/notifications';
import { formatDateTime } from '@/lib/format';
import NotificationPreferencesPanel from './NotificationPreferencesPanel';

const CATEGORY_EMOJI: Record<string, string> = {
  ConsultationRequested: '🩺',
  AppointmentRequested: '📅',
  LabResultReady: '🧪',
  DiagnosticResultReady: '🩻',
  PrescriptionInitiated: '💊',
  PatientAdmitted: '🛏️',
  PatientDischarged: '🚪',
  PatientTransferred: '🔀',
  ReferralCreated: '🔀',
  System: '🔔',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<UserNotificationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const [count, list] = await Promise.all([
        NotificationService.unreadCount(),
        NotificationService.list(1, 30, false),
      ]);
      setUnread(count.unreadCount);
      setItems(list.items);
    } catch {
      // silent — the bell is non-critical chrome
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(timer);
  }, [refresh]);

  // Real-time: refresh the bell the moment a notification is pushed.
  useEffect(() => {
    return subscribeToNotifications(() => {
      void refresh();
    });
  }, [refresh]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const openFeed = async () => {
    setOpen((prev) => !prev);
    if (!open) {
      setLoading(true);
      try {
        const list = await NotificationService.list(1, 30, false);
        setItems(list.items);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    }
  };

  const markRead = async (id: string) => {
    try {
      await NotificationService.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark read');
    }
  };

  const markAll = async () => {
    setBusy(true);
    try {
      const res = await NotificationService.markAllRead();
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success(`${res.unreadCount} notification${res.unreadCount === 1 ? '' : 's'} marked read`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark all read');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => void openFeed()}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[380px] max-w-[calc(100vw-2rem)] card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrefs((p) => !p)}
                className="text-xs font-medium text-slate-400 hover:text-indigo-600 inline-flex items-center gap-1"
                aria-label="Notification preferences"
              >
                <Settings2 size={13} />
                {showPrefs ? 'Feed' : 'Prefs'}
              </button>
              {unread > 0 && !showPrefs && (
                <button
                  type="button"
                  onClick={() => void markAll()}
                  disabled={busy}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {showPrefs ? (
            <NotificationPreferencesPanel />
          ) : (
            <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-sm">
                  <Loader2 size={16} className="animate-spin text-indigo-600" /> Loading…
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">No notifications yet.</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => void markRead(n.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${n.isRead ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-base leading-none mt-0.5">{CATEGORY_EMOJI[n.category] ?? '🔔'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{formatDateTime(n.createdAtUtc)}</p>
                      </div>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
