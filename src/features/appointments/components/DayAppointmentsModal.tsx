// ============================================================
// DayAppointmentsModal.tsx
// Location: src/features/appointments/components/DayAppointmentsModal.tsx
//
// Clicking a calendar date opens this summary: every appointment for that
// day (time, patient, clinic, status) with quick actions.
// ============================================================

import { useMemo } from 'react';
import { Clock, UserRound } from 'lucide-react';
import type { Appointment } from '../types/appointment';
import { clinicLabel } from '@/features/clinical/clinics';

const STATUS_STYLES: Record<string, string> = {
  Scheduled: 'bg-sky-100 text-sky-700',
  InProgress: 'bg-indigo-100 text-indigo-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-slate-100 text-slate-500',
  NoShow: 'bg-red-100 text-red-700',
};

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function DayAppointmentsModal({
  date, appointments, onClose,
}: {
  date: Date;
  appointments: Appointment[];
  onClose: () => void;
}) {
  const sorted = useMemo(
    () => [...appointments].sort((a, b) => a.scheduledAtUtc.localeCompare(b.scheduledAtUtc)),
    [appointments],
  );

  const dateLabel = date.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{dateLabel}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{appointments.length} appointment{appointments.length === 1 ? '' : 's'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        <div className="p-4 space-y-2">
          {sorted.length === 0 ? (
            <div className="text-center py-8">
              <UserRound size={26} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No appointments on this day.</p>
            </div>
          ) : (
            sorted.map((a) => (
              <div key={a.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock size={14} className="text-indigo-600 shrink-0" />
                    <span className="font-semibold text-slate-900 text-sm">{timeLabel(a.scheduledAtUtc)}</span>
                    <span className="text-xs text-slate-400">· {a.durationMinutes} min</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[a.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {a.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-800 mt-1.5">{a.patientName || '—'}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-slate-500">{clinicLabel(a.clinicType)}</span>
                  {a.reason && <span className="text-xs text-slate-400 truncate ml-3">{a.reason}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
