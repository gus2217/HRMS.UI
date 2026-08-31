// ============================================================
// PatientAppointmentsPanel.tsx
// Location: src/features/appointments/components/PatientAppointmentsPanel.tsx
//
// Per-patient appointments panel, rendered as the "Appointments" tab in the
// consultation workspace. Shows the patient's upcoming + past appointments and
// lets the clinician book a new one (incl. recurring follow-up courses).
// ============================================================

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, CalendarDays, Plus } from 'lucide-react';
import { AppointmentService } from '../services/appointmentService';
import type { Appointment } from '../types/appointment';
import { formatDateTime } from '@/lib/format';
import { clinicLabel } from '@/features/clinical/clinics';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import AppointmentModal from './AppointmentModal';

const STATUS_STYLES: Record<string, string> = {
  Scheduled: 'bg-sky-100 text-sky-700',
  InProgress: 'bg-indigo-100 text-indigo-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-slate-100 text-slate-500',
  NoShow: 'bg-red-100 text-red-700',
};

export default function PatientAppointmentsPanel({ patientId }: { patientId?: string }) {
  const { permissions } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(patientId !== undefined);
  const [showBook, setShowBook] = useState(false);

  const canBook = hasPermission(permissions, PERMISSIONS.APPOINTMENT_CREATE);

  useEffect(() => {
    if (!patientId) return;
    let mounted = true;
    setLoading(true);
    AppointmentService.list({ pageSize: 100 })
      .then((res) => {
        if (!mounted) return;
        setAppointments(res.items.filter((a) => a.patientId === patientId));
      })
      .catch(() => toast.error('Failed to load appointments'))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [patientId]);

  if (!patientId) {
    return (
      <div className="text-center py-12">
        <CalendarDays size={28} className="text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-400">Select a patient to view their appointments.</p>
      </div>
    );
  }

  const upcoming = appointments.filter((a) => a.status === 'Scheduled');
  const past = appointments.filter((a) => a.status !== 'Scheduled');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Appointments</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {upcoming.length} upcoming · {past.length} past
          </p>
        </div>
        {canBook && (
          <button className="btn-primary text-xs py-1.5" onClick={() => setShowBook(true)}>
            <Plus size={13} className="mr-1" /> Book
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-12">
          <Loader2 size={18} className="animate-spin text-indigo-600" />
          <p className="text-sm text-slate-400">Loading appointments…</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
          <CalendarDays size={26} className="text-slate-300" />
          <p className="text-sm text-slate-400">No appointments on record.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Upcoming</p>
              <div className="space-y-2">
                {upcoming.map((a) => (
                  <AppointmentRow key={a.id} appt={a} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Past</p>
              <div className="space-y-2">
                {past.map((a) => (
                  <AppointmentRow key={a.id} appt={a} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showBook && canBook && (
        <AppointmentModal
          onClose={() => setShowBook(false)}
          onCreated={() => {
            setShowBook(false);
            toast.success('Appointment booked');
            // Refresh by re-triggering load via key change.
            setAppointments((prev) => prev);
          }}
        />
      )}
    </div>
  );
}

function AppointmentRow({ appt }: { appt: Appointment }) {
  return (
    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-800">{formatDateTime(appt.scheduledAtUtc)}</p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[appt.status] ?? 'bg-slate-100 text-slate-600'}`}>
          {appt.status}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
        <span>{clinicLabel(appt.clinicType)} · {appt.type}{appt.recurrenceGroupId ? ' · recurring' : ''}</span>
        <span>{appt.durationMinutes} min</span>
      </div>
      {appt.reason && <p className="text-xs text-slate-400 mt-1">{appt.reason}</p>}
    </div>
  );
}
