// ============================================================
// PatientAppointmentsPanel.tsx
// Location: src/features/appointments/components/PatientAppointmentsPanel.tsx
//
// Per-patient appointments panel, rendered as the "Appointments" tab in the
// consultation workspace and on patient-facing flows. Patient-scoped
// server-side (patientId filter) so a clinician in a consultation sees only
// the consulted patient's visits.
//
// When rendered inside an open consultation (consultationId passed), the
// "Book" flow pre-selects that patient and links the new appointment to the
// consultation (previousConsultationId) — so when the appointment is later
// started, a new consultation is created that continues this consultation's
// record, recorded as an appointment-driven visit.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, CalendarDays, Plus, Link2, CalendarClock, Stethoscope } from 'lucide-react';
import { AppointmentService } from '../services/appointmentService';
import type { Appointment } from '../types/appointment';
import { formatDateTime, formatDate } from '@/lib/format';
import { clinicLabel } from '@/features/clinical/clinics';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import AppointmentModal from './AppointmentModal';
import { ConsultationService } from '@/features/consultations/services/consultationService';
import type { ConsultationDetail } from '@/features/consultations/types/consultation';

const STATUS_STYLES: Record<string, string> = {
  Scheduled: 'bg-sky-100 text-sky-700',
  InProgress: 'bg-indigo-100 text-indigo-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-slate-100 text-slate-500',
  NoShow: 'bg-red-100 text-red-700',
};

interface Props {
  patientId?: string;
  patientNumber?: string;
  patientName?: string;
  /** When set, booking pre-links the appointment to this open consultation. */
  consultation?: ConsultationDetail | null;
  onConsultationChanged?: (c: ConsultationDetail | null) => void;
}

export default function PatientAppointmentsPanel({
  patientId,
  patientNumber,
  patientName,
  consultation,
  onConsultationChanged,
}: Props) {
  const { permissions, user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(patientId !== undefined);
  const [showBook, setShowBook] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

  const canBook = hasPermission(permissions, PERMISSIONS.APPOINTMENT_CREATE);
  const canStart = hasPermission(permissions, PERMISSIONS.CLINICAL_CONSULT);

  const load = useCallback(async () => {
    if (!patientId) return;
    let mounted = true;
    setLoading(true);
    try {
      const res = await AppointmentService.list({ patientId, pageSize: 100 });
      if (!mounted) return;
      setAppointments(res.items);
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      if (mounted) setLoading(false);
    }
    return () => { mounted = false; };
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!patientId) {
    return (
      <div className="text-center py-12">
        <CalendarDays size={28} className="text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-400">Select a patient to view their appointments.</p>
      </div>
    );
  }

  const upcoming = appointments.filter((a) => a.status === 'Scheduled').sort((a, b) => a.scheduledAtUtc.localeCompare(b.scheduledAtUtc));
  const past = appointments.filter((a) => a.status !== 'Scheduled').sort((a, b) => b.scheduledAtUtc.localeCompare(a.scheduledAtUtc));

  /** Starts a scheduled appointment → registers the consultation that continues the linked record. */
  const start = async (appt: Appointment) => {
    if (!user?.id) return;
    setStartingId(appt.id);
    try {
      const res = await AppointmentService.start(appt.id);
      toast.success('Appointment started — consultation registered');
      await load();
      if (onConsultationChanged && res.consultationId) {
        const detail = await ConsultationService.detail(res.consultationId);
        onConsultationChanged(detail);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start appointment');
    } finally {
      setStartingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Panel header — patient context */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full bg-indigo-600/10 text-indigo-700 flex items-center justify-center shrink-0">
            <CalendarDays size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Appointments</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {patientName ? `${patientName}${patientNumber ? ` · ${patientNumber}` : ''} · ` : ''}
              {upcoming.length} upcoming · {past.length} past
            </p>
          </div>
        </div>
        {canBook && (
          <button className="btn-primary text-xs py-1.5" onClick={() => setShowBook(true)}>
            <Plus size={13} className="mr-1" /> Book for this patient
          </button>
        )}
      </div>

      {/* Linked-consultation context */}
      {consultation && (
        <div className="flex items-start gap-2.5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
          <Link2 size={15} className="text-violet-600 mt-0.5 shrink-0" />
          <div className="text-xs text-violet-800">
            <p className="font-semibold flex items-center gap-1.5">
              <Stethoscope size={12} /> Open consultation · {formatDateTime(consultation.startedAtUtc)}
            </p>
            <p className="mt-0.5 text-violet-700">
              Appointments booked here are linked to this consultation — when the patient comes for the
              appointment and it is started, the new visit continues this consultation's notes and record.
            </p>
          </div>
        </div>
      )}

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
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CalendarClock size={12} /> Upcoming
              </p>
              <div className="grid gap-2">
                {upcoming.map((a) => (
                  <AppointmentCard
                    key={a.id}
                    appt={a}
                    isLinked={consultation ? a.previousConsultationId === consultation.id || a.consultationId === consultation.id : false}
                    canStart={canStart && a.status === 'Scheduled'}
                    starting={startingId === a.id}
                    onStart={() => void start(a)}
                  />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Past</p>
              <div className="grid gap-2">
                {past.map((a) => (
                  <AppointmentCard
                    key={a.id}
                    appt={a}
                    isLinked={consultation ? a.previousConsultationId === consultation.id || a.consultationId === consultation.id : false}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showBook && canBook && (
        <AppointmentModal
          patient={
            patientName
              ? {
                  id: patientId!,
                  patientNumber: patientNumber ?? '',
                  fullName: patientName,
                  dateOfBirth: '',
                  phone: null,
                  lastVisitDate: null,
                }
              : null
          }
          linkConsultation={
            consultation
              ? { id: consultation.id, label: `This consultation · started ${formatDateTime(consultation.startedAtUtc)}` }
              : null
          }
          onClose={() => setShowBook(false)}
          onCreated={() => {
            setShowBook(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function AppointmentCard({
  appt,
  isLinked,
  canStart,
  starting,
  onStart,
}: {
  appt: Appointment;
  isLinked: boolean;
  canStart?: boolean;
  starting?: boolean;
  onStart?: () => void;
}) {
  return (
    <div
      className={`p-3.5 rounded-xl border transition-colors ${
        isLinked ? 'border-violet-200 bg-violet-50/60' : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              appt.status === 'Scheduled' ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <CalendarDays size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              {formatDate(appt.scheduledAtUtc)}
              <span className="text-slate-400 font-normal"> · {new Date(appt.scheduledAtUtc).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {clinicLabel(appt.clinicType)} · {appt.type}
              {appt.recurrenceGroupId ? ' · recurring' : ''} · {appt.durationMinutes} min
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isLinked && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
              <Link2 size={10} />
              {appt.consultationId === appt.previousConsultationId
                ? 'Linked'
                : appt.previousConsultationId
                  ? 'Continues consultation'
                  : 'From this consultation'}
            </span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[appt.status] ?? 'bg-slate-100 text-slate-600'}`}>
            {appt.status}
          </span>
          {canStart && onStart && (
            <button
              className="btn-ghost text-xs !px-2.5"
              disabled={starting}
              onClick={onStart}
              title="Start now — registers the consultation that continues the linked record"
            >
              {starting ? <Loader2 size={12} className="animate-spin" /> : <Stethoscope size={12} />}
              Start
            </button>
          )}
        </div>
      </div>
      {appt.reason && <p className="text-xs text-slate-400 mt-1.5 ml-12">{appt.reason}</p>}
    </div>
  );
}
