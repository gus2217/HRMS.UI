import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Plus, Stethoscope, Inbox } from 'lucide-react';
import { ConsultationService } from '../services/consultationService';
import type { ConsultationDetail, ConsultationListItem } from '../types/consultation';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import StartConsultationModal from '../components/StartConsultationModal';
import ConsultationDetailView from '../components/ConsultationDetailView';

interface ConsultationRow extends ConsultationListItem {
  detail?: ConsultationDetail;
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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showStart, setShowStart] = useState(false);
  const [active, setActive] = useState<ConsultationRow | null>(null);
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

  useEffect(() => {
    void load(page, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  const openConsultation = async (row: ConsultationRow) => {
    setActiveLoading(true);
    setActive(row);
    try {
      const detail = await ConsultationService.detail(row.id);
      setActive({ ...row, detail });
    } catch {
      setActive({ ...row, detail: undefined });
    } finally {
      setActiveLoading(false);
    }
  };

  const selectStatus = (s: string) => {
    setStatus(s);
    setPage(1);
  };

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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Working queue */}
        <div className="card overflow-hidden">
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

        {/* Detail panel */}
        <div className="card p-5 min-h-[300px]">
          {activeLoading ? (
            <div className="flex items-center justify-center gap-3 py-16">
              <Loader2 size={20} className="animate-spin text-indigo-600" />
              <p className="text-sm text-slate-400">Loading consultation…</p>
            </div>
          ) : active ? (
            <ConsultationDetailView
              consultation={active.detail ?? null}
              patientId={active.patientId}
              patientName={active.patientName}
              patientNumber={active.patientNumber}
              onChanged={(updated) => {
                setActive((prev) => (prev ? { ...prev, detail: updated, status: updated.status } : prev));
                void load(page, status);
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Stethoscope size={28} className="text-slate-300" />
              <p className="text-sm text-slate-400 max-w-xs">Select a consultation to view or work it.</p>
            </div>
          )}
        </div>
      </div>

      {showStart && (
        <StartConsultationModal
          onClose={() => setShowStart(false)}
          onStarted={(c) => {
            setShowStart(false);
            setActive({ ...c, patientName: c.patientId, patientNumber: '', detail: c });
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

export { formatDateTime };
