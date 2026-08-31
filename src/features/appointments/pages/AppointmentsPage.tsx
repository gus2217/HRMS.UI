// ============================================================
// AppointmentsPage.tsx
// Location: src/features/appointments/pages/AppointmentsPage.tsx
//
// Appointments workspace — one page, two roles:
//   • Clinician (Appointment.Create/Approve): today's queue with a
//     "Start" action (→ registers the consultation), the monthly
//     calendar, and pending approval requests.
//   • Receptionist (Appointment.View/Request): the monthly calendar
//     (tagged by clinic) and the ability to raise approval requests.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Loader2, Plus, CalendarDays, Clock, CheckCircle2, XCircle, RefreshCw, Send, Stethoscope,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppointmentService } from '../services/appointmentService';
import type { Appointment, AppointmentRequest } from '../types/appointment';
import { clinicLabel } from '@/features/clinical/clinics';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import AppointmentCalendar from '../components/AppointmentCalendar';
import AppointmentModal from '../components/AppointmentModal';
import RequestAppointmentModal from '../components/RequestAppointmentModal';
import DayAppointmentsModal from '../components/DayAppointmentsModal';
import ApproveRequestModal from '../components/ApproveRequestModal';

const STATUS_STYLES: Record<string, string> = {
  Scheduled: 'bg-sky-100 text-sky-700',
  InProgress: 'bg-indigo-100 text-indigo-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-slate-100 text-slate-500',
  NoShow: 'bg-red-100 text-red-700',
};

const REQ_STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Declined: 'bg-red-100 text-red-700',
  Scheduled: 'bg-sky-100 text-sky-700',
};

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AppointmentsPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [monthAppts, setMonthAppts] = useState<Appointment[]>([]);
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([]);
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBook, setShowBook] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [dayModal, setDayModal] = useState<Date | null>(null);
  const [approving, setApproving] = useState<AppointmentRequest | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canBook = hasPermission(permissions, PERMISSIONS.APPOINTMENT_CREATE);
  const canRequest = hasPermission(permissions, PERMISSIONS.APPOINTMENT_REQUEST);
  const canApprove = hasPermission(permissions, PERMISSIONS.APPOINTMENT_APPROVE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [monthRes, todayRes, reqRes] = await Promise.all([
        AppointmentService.calendar(year, month),
        AppointmentService.today(),
        AppointmentService.listRequests('Pending').catch(() => ({ items: [] as AppointmentRequest[] })),
      ]);
      setMonthAppts(monthRes);
      setTodayAppts(todayRes);
      setRequests(reqRes.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const start = async (a: Appointment) => {
    setBusyId(a.id);
    try {
      await AppointmentService.start(a.id);
      toast.success(`Visit started for ${a.patientName}`);
      await load();
      if (confirm('Visit started — open the consultation workspace to record the visit?')) {
        navigate('/consultations');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start appointment');
    } finally {
      setBusyId(null);
    }
  };

  const noShow = async (a: Appointment) => {
    setBusyId(a.id);
    try {
      await AppointmentService.noShow(a.id);
      toast.success('Marked as no-show');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setBusyId(null);
    }
  };

  const decline = async (r: AppointmentRequest) => {
    setBusyId(r.id);
    try {
      await AppointmentService.declineRequest(r.id);
      toast.success('Request declined');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to decline');
    } finally {
      setBusyId(null);
    }
  };

  const dayAppointments = dayModal
    ? monthAppts.filter((a) => {
        const d = new Date(a.scheduledAtUtc);
        return d.getFullYear() === dayModal.getFullYear()
          && d.getMonth() === dayModal.getMonth()
          && d.getDate() === dayModal.getDate();
      })
    : [];

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Appointments</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {todayAppts.length} today · {monthAppts.length} this month
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-xs" onClick={() => void load()}>
            <RefreshCw size={13} className="mr-1" /> Refresh
          </button>
          {canBook && (
            <button className="btn-primary" onClick={() => setShowBook(true)}>
              <Plus size={16} /> Book appointment
            </button>
          )}
          {canRequest && (
            <button className="btn-ghost" onClick={() => setShowRequest(true)}>
              <Send size={14} className="mr-1" /> Request appointment
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's queue — clinicians */}
        <div className="lg:col-span-2 space-y-5">
          {canBook && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                <Clock size={15} className="text-indigo-600" />
                <h2 className="text-sm font-semibold text-slate-900">Today's queue</h2>
              </div>
              {loading ? (
                <div className="flex items-center justify-center gap-3 py-10">
                  <Loader2 size={18} className="animate-spin text-indigo-600" />
                  <p className="text-sm text-slate-400">Loading…</p>
                </div>
              ) : todayAppts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                  <CalendarDays size={26} className="text-slate-300" />
                  <p className="text-sm text-slate-400">No appointments scheduled for today.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {todayAppts.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-semibold text-slate-900 text-sm w-14 shrink-0">{timeLabel(a.scheduledAtUtc)}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{a.patientName || '—'}</p>
                          <p className="text-[11px] text-slate-400">
                            {clinicLabel(a.clinicType)} · {a.type}
                            {a.reason ? ` · ${a.reason}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[a.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {a.status}
                        </span>
                        {a.status === 'Scheduled' && (
                          <>
                            <button className="btn-primary text-xs py-1.5" disabled={busyId === a.id} onClick={() => void start(a)}>
                              {busyId === a.id ? <Loader2 size={12} className="animate-spin mr-1" /> : <CheckCircle2 size={12} className="mr-1" />}
                              Start
                            </button>
                            <button className="btn-ghost text-xs py-1.5 text-red-600 border-red-200 hover:bg-red-50" disabled={busyId === a.id} onClick={() => void noShow(a)}>
                              <XCircle size={12} className="mr-1" /> No-show
                            </button>
                          </>
                        )}
                        {a.status === 'InProgress' && (
                          <button className="btn-ghost text-xs py-1.5" onClick={() => navigate('/consultations')}>
                            <Stethoscope size={12} className="mr-1" /> Open
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Pending requests — clinicians */}
          {canApprove && requests.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                <Send size={15} className="text-amber-600" />
                <h2 className="text-sm font-semibold text-slate-900">Appointment requests awaiting approval</h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.patientName || '—'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{r.reason}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {clinicLabel(r.clinicType)} · requested by {r.requestedByName}
                        {r.preferredDate ? ` · prefers ${r.preferredDate}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${REQ_STATUS_STYLES[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {r.status}
                      </span>
                      <button className="btn-primary text-xs py-1.5" onClick={() => setApproving(r)}>
                        Approve
                      </button>
                      <button className="btn-ghost text-xs py-1.5 text-red-600 border-red-200 hover:bg-red-50" disabled={busyId === r.id} onClick={() => void decline(r)}>
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Calendar */}
        <div>
          <AppointmentCalendar
            year={year}
            month={month}
            appointments={monthAppts}
            onDateClick={(d) => setDayModal(d)}
            onPrevMonth={() => setMonth((m) => (m === 1 ? (setYear((y) => y - 1), 12) : m - 1))}
            onNextMonth={() => setMonth((m) => (m === 12 ? (setYear((y) => y + 1), 1) : m + 1))}
          />
        </div>
      </div>

      {showBook && canBook && (
        <AppointmentModal
          onClose={() => setShowBook(false)}
          onCreated={(appts) => {
            setShowBook(false);
            toast.success(`${appts.length} appointment${appts.length === 1 ? '' : 's'} booked`);
            void load();
          }}
        />
      )}

      {showRequest && canRequest && (
        <RequestAppointmentModal
          onClose={() => setShowRequest(false)}
          onRequested={(req) => {
            setShowRequest(false);
            toast.success(`Request sent to ${clinicLabel(req.clinicType)}`);
            void load();
          }}
        />
      )}

      {dayModal && (
        <DayAppointmentsModal
          date={dayModal}
          appointments={dayAppointments}
          onClose={() => setDayModal(null)}
        />
      )}

      {approving && (
        <ApproveRequestModal
          request={approving}
          onClose={() => setApproving(null)}
          onApproved={(a) => {
            setApproving(null);
            toast.success(`Appointment booked for ${a.patientName}`);
            void load();
          }}
        />
      )}
    </div>
  );
}
