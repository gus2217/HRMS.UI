// ============================================================
// NotificationPreferencesPanel.tsx
// Location: src/features/notifications/components/NotificationPreferencesPanel.tsx
//
// Per-user, per-category delivery preferences. In-app toggles are
// live; the SMS toggle is stored now and takes effect the moment
// the SMS channel ships (backend already filters on it).
// ============================================================

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { NotificationService } from '../services/notificationService';
import type { NotificationPreferenceDto, NotificationCategory } from '../types/notifications';

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  ConsultationRequested: 'Consultation requested',
  AppointmentRequested: 'Appointment booked',
  LabResultReady: 'Lab results',
  DiagnosticResultReady: 'Imaging & procedures',
  PrescriptionInitiated: 'Prescriptions',
  PatientAdmitted: 'Patient admitted',
  PatientDischarged: 'Patient discharged',
  PatientTransferred: 'Patient transferred',
  ReferralCreated: 'Referrals',
  System: 'System',
};

export default function NotificationPreferencesPanel() {
  const [prefs, setPrefs] = useState<NotificationPreferenceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setPrefs(await NotificationService.preferences());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggle = async (p: NotificationPreferenceDto, field: 'inAppEnabled' | 'smsEnabled') => {
    const next = { ...p, [field]: !p[field] };
    setPrefs((prev) => prev.map((x) => (x.category === p.category ? next : x)));
    setSaving(true);
    try {
      await NotificationService.updatePreference({
        category: p.category,
        inAppEnabled: next.inAppEnabled,
        smsEnabled: next.smsEnabled,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update preference');
      setPrefs((prev) => prev.map((x) => (x.category === p.category ? p : x)));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-sm">
        <Loader2 size={16} className="animate-spin text-indigo-600" /> Loading preferences…
      </div>
    );
  }

  return (
    <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
      <div className="px-4 py-2.5 bg-slate-50">
        <p className="text-[11px] text-slate-500">
          Choose how you receive each notification type. SMS takes effect once the SMS channel is connected.
        </p>
      </div>
      {prefs.map((p) => (
        <div key={p.category} className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">{CATEGORY_LABELS[p.category] ?? p.category}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={p.inAppEnabled}
                disabled={saving}
                onChange={() => void toggle(p, 'inAppEnabled')}
                className="accent-indigo-600 w-3.5 h-3.5"
              />
              In-app
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={p.smsEnabled}
                disabled={saving}
                onChange={() => void toggle(p, 'smsEnabled')}
                className="accent-indigo-600 w-3.5 h-3.5"
              />
              SMS
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}
