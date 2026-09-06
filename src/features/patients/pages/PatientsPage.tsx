import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, UserPlus, Loader2, Users, Stethoscope, Activity, ScanLine, CalendarPlus, Flag, ExternalLink } from 'lucide-react';
import { PatientService } from '../services/patientService';
import { ConsultationService } from '@/features/consultations/services/consultationService';
import type { PatientSummary } from '../types/patient';
import { formatDate, ageFromDateOfBirth } from '@/lib/format';
import RegisterPatientModal from '../components/RegisterPatientModal';
import RecordVitalsModal from '../components/RecordVitalsModal';
import CreateDiagnosticOrderModal from '../components/CreateDiagnosticOrderModal';
import RaiseFlagModal from '../components/RaiseFlagModal';
import AppointmentModal from '@/features/appointments/components/AppointmentModal';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

type QuickAction = 'vitals' | 'imaging' | 'book' | 'flag' | null;

export default function PatientsPage() {
  const navigate = useNavigate();
  const { permissions, user } = useAuth();
  const [items, setItems] = useState<PatientSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [quickPatient, setQuickPatient] = useState<PatientSummary | null>(null);
  const [quickAction, setQuickAction] = useState<QuickAction>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canConsult = hasPermission(permissions, PERMISSIONS.CLINICAL_CONSULT);
  const canBook = hasPermission(permissions, PERMISSIONS.APPOINTMENT_CREATE);

  const load = async (term: string, pageNumber: number) => {
    setLoading(true);
    try {
      const res = await PatientService.search(term || undefined, pageNumber, 25);
      setItems(res.items);
      setTotal(res.totalCount);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      void load(value, 1);
    }, 350);
  };

  /** Quick action: start a consultation and open it in the consultation workspace. */
  const quickConsult = async (p: PatientSummary) => {
    if (!user?.id) return;
    setStarting(p.id);
    try {
      const c = await ConsultationService.start(p.id, user.id);
      toast.success(`Consultation started for ${p.fullName}`);
      navigate('/consultations', {
        state: { openConsultation: c, patientName: p.fullName, patientNumber: p.patientNumber },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start consultation');
    } finally {
      setStarting(null);
    }
  };

  const openQuick = (p: PatientSummary, action: Exclude<QuickAction, null>) => {
    setQuickPatient(p);
    setQuickAction(action);
  };

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Patients</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString()} records</p>
        </div>
        {hasPermission(permissions, PERMISSIONS.PATIENT_REGISTER) && (
          <button className="btn-primary" onClick={() => setShowRegister(true)}>
            <UserPlus size={16} />
            Register patient
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-10"
          placeholder="Search by name, number, phone or ID…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16">
            <Loader2 size={20} className="animate-spin text-indigo-600" />
            <p className="text-sm text-slate-400">Loading patients…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users size={28} className="text-slate-300" />
            <p className="text-sm text-slate-400">No patients found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Patient no.</th>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Date of birth</th>
                  <th>Phone</th>
                  <th>Last visit</th>
                  <th className="text-right">Quick actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="cursor-pointer group" onClick={() => navigate(`/patients/${p.id}`)}>
                    <td className="font-mono text-xs text-indigo-600">{p.patientNumber}</td>
                    <td className="font-medium text-slate-900">{p.fullName}</td>
                    <td>{ageFromDateOfBirth(p.dateOfBirth) ?? '—'}</td>
                    <td>{formatDate(p.dateOfBirth)}</td>
                    <td>{p.phone ?? '—'}</td>
                    <td>{formatDate(p.lastVisitDate)}</td>
                    <td>
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        role="presentation"
                      >
                        {canConsult && (
                          <button
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Consult — start a consultation"
                            disabled={starting === p.id}
                            onClick={() => void quickConsult(p)}
                          >
                            {starting === p.id ? <Loader2 size={14} className="animate-spin" /> : <Stethoscope size={14} />}
                          </button>
                        )}
                        {canConsult && (
                          <button
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                            title="Triage — record vitals"
                            onClick={() => openQuick(p, 'vitals')}
                          >
                            <Activity size={14} />
                          </button>
                        )}
                        {canConsult && (
                          <button
                            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                            title="Imaging / procedure order"
                            onClick={() => openQuick(p, 'imaging')}
                          >
                            <ScanLine size={14} />
                          </button>
                        )}
                        {canBook && (
                          <button
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Book appointment"
                            onClick={() => openQuick(p, 'book')}
                          >
                            <CalendarPlus size={14} />
                          </button>
                        )}
                        {canConsult && (
                          <button
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Raise a patient flag"
                            onClick={() => openQuick(p, 'flag')}
                          >
                            <Flag size={14} />
                          </button>
                        )}
                        <button
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Open record"
                          onClick={() => navigate(`/patients/${p.id}`)}
                        >
                          <ExternalLink size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 25 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Page {page} of {Math.max(1, Math.ceil(total / 25))}
          </p>
          <div className="flex gap-2">
            <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <button className="btn-ghost" disabled={page >= Math.ceil(total / 25)} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      )}

      {showRegister && (
        <RegisterPatientModal
          onClose={() => setShowRegister(false)}
          onCreated={(p) => {
            setShowRegister(false);
            navigate(`/patients/${p.id}`);
          }}
        />
      )}

      {/* Quick-action modals (patient-scoped) */}
      {quickPatient && quickAction === 'vitals' && (
        <RecordVitalsModal
          patientId={quickPatient.id}
          onClose={() => { setQuickPatient(null); setQuickAction(null); }}
          onSaved={() => { setQuickPatient(null); setQuickAction(null); }}
        />
      )}
      {quickPatient && quickAction === 'imaging' && (
        <CreateDiagnosticOrderModal
          patientId={quickPatient.id}
          onClose={() => { setQuickPatient(null); setQuickAction(null); }}
          onSaved={() => { setQuickPatient(null); setQuickAction(null); }}
        />
      )}
      {quickPatient && quickAction === 'book' && (
        <AppointmentModal
          patient={quickPatient}
          onClose={() => { setQuickPatient(null); setQuickAction(null); }}
          onCreated={() => { setQuickPatient(null); setQuickAction(null); }}
        />
      )}
      {quickPatient && quickAction === 'flag' && (
        <RaiseFlagModal
          patientId={quickPatient.id}
          onClose={() => { setQuickPatient(null); setQuickAction(null); }}
          onSaved={() => { setQuickPatient(null); setQuickAction(null); }}
        />
      )}
    </div>
  );
}
