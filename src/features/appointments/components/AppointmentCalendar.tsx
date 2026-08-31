// ============================================================
// AppointmentCalendar.tsx
// Location: src/features/appointments/components/AppointmentCalendar.tsx
//
// Month calendar grid. Dates with appointments are highlighted and tagged
// with the clinic short codes; clicking a date opens the day-summary modal.
// ============================================================

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Appointment } from '../types/appointment';
import { clinicShortCode } from '@/features/clinical/clinics';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  year: number;
  month: number; // 1-12
  appointments: Appointment[];
  onDateClick: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export default function AppointmentCalendar({
  year, month, appointments, onDateClick, onPrevMonth, onNextMonth,
}: Props) {
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const d = new Date(a.scheduledAtUtc);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      (map.get(key) ?? map.set(key, []).get(key)!).push(a);
    }
    return map;
  }, [appointments]);

  // Day cells for the month grid (Sun-first).
  const cells = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const startOffset = first.getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month - 1, d));
    return cells;
  }, [year, month]);

  const today = new Date();
  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <button type="button" className="btn-ghost p-1.5" onClick={onPrevMonth} aria-label="Previous month">
            <ChevronLeft size={15} />
          </button>
          <button type="button" className="btn-ghost p-1.5" onClick={onNextMonth} aria-label="Next month">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-[10px] font-semibold text-slate-400 uppercase text-center py-1">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} />;
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          const dayAppts = byDay.get(key) ?? [];
          const hasAppts = dayAppts.length > 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onDateClick(d)}
              className={`relative min-h-[52px] rounded-lg border p-1.5 text-left transition-colors ${
                isToday(d)
                  ? 'border-indigo-300 bg-indigo-50'
                  : hasAppts
                    ? 'border-slate-200 bg-slate-50 hover:bg-indigo-50'
                    : 'border-slate-100 hover:bg-slate-50'
              }`}
            >
              <span className={`text-xs font-medium ${isToday(d) ? 'text-indigo-700' : 'text-slate-600'}`}>
                {d.getDate()}
              </span>
              {hasAppts && (
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {Array.from(new Set(dayAppts.map((a) => a.clinicType))).slice(0, 3).map((c) => (
                    <span key={c} className="text-[8px] font-semibold px-1 py-0.5 rounded bg-indigo-100 text-indigo-700 leading-none">
                      {clinicShortCode(c)}
                    </span>
                  ))}
                  {new Set(dayAppts.map((a) => a.clinicType)).size > 3 && (
                    <span className="text-[8px] text-slate-400">+</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
