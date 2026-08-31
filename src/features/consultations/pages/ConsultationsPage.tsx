import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Loader2, Plus, Stethoscope, Inbox, ArrowLeft, UserRound, Phone, CalendarDays,
} from 'lucide-react';
import { ConsultationService } from '../services/consultationService';
import { PatientService } from '@/features/patients/services/patientService';
import type { ConsultationDetail, ConsultationListItem } from '../types/consultation';
import type { PatientSummary } from '@/features/patients/types/patient';
import { formatDateTime, ageFromDateOfBirth } from '@/lib/format';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import StartConsultationModal from '../components/StartConsultationModal';
import ConsultationDetailView from '../components/ConsultationDetailView';

interface ConsultationRow extends ConsultationListItem {
  detail?: ConsultationDetail;
}

interface Workspace {
  patientId: string;
  patientName: string;
  patientNumber: string;
  consultation: ConsultationDetail | null;
  loading: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  Registered: 'bg-slate-100 text-slate-600',
  Triaged: 'bg-sky-100 text-sky-700',
  AwaitingClinician: 'bg-amber-100 text-amber-700',
  InConsultation: 'bg-indigo-100 text-indigo-700',
  AwaitingLabResults: 'bg-violet-100 text-violet-700',
  DiagnosisRecorded: 'bg-cyan-100 text-cyan-700',
  Completed: 'bg-emerald-100 text-emerald-700',
};

export default function ConsultationsPage() {
  const { permissions } = useAuth();
  const [rows, setRows] = useState<ConsultationRow[]>([]);
  const [latestPatients, setLatestPatients] = useState<PatientSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showStart, setShowStart] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [activeLoading, setActiveLoading] = useState(false);

  const canConsult = hasPermission(permissions, PERMISSIONS.CLINICAL_CONSULT);

  const load = async (pageNumber: number, statusFilter: string) => {
    setLoading(true);
    try {
      const res = await ConsultationService.list(pageNumber, 20, statusFilter || undefined);
      setRows(res.items);
      setTotal(res.totalCount);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load consultations');
    } finally {
      setLoading(false);
    }
  };

  const loadLatestPatients = async () => {
    try {
      const res = await PatientService.search('', 1, 8, 'latest');
      setLatestPatients(res.items);
    } catch {
      setLatestPatients([]);
    }
  };

  useEffect(() => {
    void load(page, status);
    void loadLatestPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  /** Opens the full-screen workspace for a consultation row. */
  const openConsultation = async (row: ConsultationRow) => {
    setActiveLoading(true);
    setWorkspace({
      patientId: row.patientId,
      patientName: row.patientName,
      patientNumber: row.patientNumber,
      consultation: row.detail ?? null,
      loading: !row.detail,
    });
    try {
      const detail = row.detail ?? await ConsultationService.detail(row.id);
      setWorkspace((w) => (w ? { ...w, consultation: detail, loading: false } : w));
    } catch {
      setWorkspace((w) => (w ? { ...w, loading: false } : w));
    } finally {
      setActiveLoading(false);
    }
  };

  /** Opens the full-screen workspace for a patient (latest consultation if any). */
  const openPatientWorkspace = async (patient: PatientSummary) => {
    setActiveLoading(true);
    setWorkspace({
      patientId: patient.id,
      patientName: patient.fullName,
      patientNumber: patient.patientNumber,
      consultation: null,
      loading: true,
    });
    try {
      const history = await ConsultationService.history(patient.id);
      const latest = history.consultations[0] ?? null;
      const consultation = latest ? await ConsultationService.detail(latest.id) : null;
      setWorkspace((w) => (w ? { ...w, consultation, loading: false } : w));
    } catch {
      setWorkspace((w) => (w ? { ...w, loading: false } : w));
    } finally {
      setActiveLoading(false);
    }
  };

  const selectStatus = (s: string) => {
    setStatus(s);
    setPage(1);
  };

  const closeWorkspace = () => {
    setWorkspace(null);
    void load(page, status);
  };

  /* ── Full-screen workspace: tabs render in full, no patient list ── */
  if (workspace) {
    return (
      <div className="p-5 lg:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button className="btn-ghost text-xs" onClick={closeWorkspace} disabled={activeLoading}>
            <ArrowLeft size={14} className="mr-1" />
            Back to queue
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">{workspace.patientName}</p>
              <p className="font-mono text-xs text-indigo-600">{workspace.patientNumber}</p>
            </div>
            <span className="w-10 h-10 rounded-full bg-indigo-600/10 text-indigo-700 flex items-center justify-center font-bold text-sm">
              {workspace.patientName.slice(0, 2).toUpperCase()}
            </span>
          </div>
        </div>

        <ConsultationDetailView
          consultation={workspace.consultation}
          patientId={workspace.patientId}
          patientName={workspace.patientName}
          patientNumber={workspace.patientNumber}
          onChanged={(updated) => {
            setWorkspace((w) => (w ? { ...w, consultation: updated } : w));
            void load(page, status);
          }}
        />
      </div>
    );
  }

  /* ── Default view: queue (left) + latest patients (right) ── */
  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Consultations</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString()} consultations</p>
        </div>
        {canConsult && (
          <button className="btn-primary" onClick={() => setShowStart(true)}>
            <Plus size={16} />
            Start consultation
          </button>
        )}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <FilterChip label="All" active={status === ''} onClick={() => selectStatus('')} />
        {Object.keys(STATUS_STYLES).map((s) => (
          <FilterChip key={s} label={s} active={status === s} onClick={() => selectStatus(s)} />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Working queue */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
            <Stethoscope size={15} className="text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">Consultation queue</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-14">
              <Loader2 size={20} className="animate-spin text-indigo-600" />
              <p className="text-sm text-slate-400">Loading…</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Inbox size={28} className="text-slate-300" />
              <p className="text-sm text-slate-400 max-w-xs">No consultations{status ? ` with status "${status}"` : ''}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className="cursor-pointer" onClick={() => void openConsultation(c)}>
                      <td>
                        <p className="font-medium text-slate-900">{c.patientName}</p>
                        <p className="font-mono text-xs text-indigo-600">{c.patientNumber}</p>
                      </td>
                      <td>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="text-slate-500 text-xs">{formatDateTime(c.startedAtUtc)}</td>
                      <td className="text-right">
                        <button
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            void openConsultation(c);
                          }}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > 20 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 text-sm">
              <p className="text-slate-500">Page {page} of {Math.max(1, Math.ceil(total / 20))}</p>
              <div className="flex gap-2">
                <button className="btn-ghost text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                <button className="btn-ghost text-xs" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>

        {/* Latest patients */}
        <div className="card overflow-hidden h-fit">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
            <UserRound size={15} className="text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">Latest patients</h2>
          </div>
          {latestPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <UserRound size={26} className="text-slate-300" />
              <p className="text-xs text-slate-400 max-w-[200px]">No patients registered yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {latestPatients.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    onClick={() => void openPatientWorkspace(p)}
                  >
                    <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-semibold text-xs shrink-0">
                      {p.fullName.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900 truncate">{p.fullName}</span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">
                        <span className="font-mono text-indigo-600">{p.patientNumber}</span>
                        {p.dateOfBirth ? ` · ${ageFromDateOfBirth(p.dateOfBirth) ?? '—'} yrs` : ''}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-0.5 shrink-0">
                      {p.phone && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Phone size={10} /> {p.phone}
                        </span>
                      )}
                      {p.lastVisitDate && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <CalendarDays size={10} /> {formatDateTime(p.lastVisitDate)}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60">
            <p className="text-[11px] text-slate-400">Most recently registered patients — click to open their record.</p>
          </div>
        </div>
      </div>

      {showStart && (
        <StartConsultationModal
          onClose={() => setShowStart(false)}
          onStarted={(c, patient) => {
            setShowStart(false);
            setWorkspace({
              patientId: c.patientId,
              patientName: patient.fullName,
              patientNumber: patient.patientNumber,
              consultation: c,
              loading: false,
            });
            void load(page, status);
          }}
        />
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
        active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-900'
      }`}
    >
      {label}
    </button>
  );
}
