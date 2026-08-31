// ============================================================
// QueuePage.tsx
// Location: src/features/queue/pages/QueuePage.tsx
//
// Consultation queue board — the single source of truth between
// reception and the clinics:
//   • Receptionist (Queue.Create/View): queues patients by clinic with
//     triage priority + notes; cancels waiting entries.
//   • Clinicians (Queue.View/Accept): see the clinic queue, accept →
//     the consultation is registered atomically and opens in their
//     consultations workspace.
// Board refreshes automatically so it behaves like a live queue display.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Loader2, Plus, Users, CheckCircle2, XCircle, RefreshCw, Clock, Stethoscope,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QueueService } from '../services/queueService';
import type { QueueEntry, QueuePriority } from '../types/queue';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import QueuePatientModal from '../components/QueuePatientModal';

// Mirrors the backend ClinicType enum + the registration clinic list.
const CLINIC_TYPES = [
  { value: 'GeneralOutpatient', label: 'General outpatient' },
  { value: 'Counselling', label: 'Counselling' },
  { value: 'Laboratory', label: 'Laboratory' },
  { value: 'Immunization', label: 'Immunization' },
  { value: 'Wellness', label: 'Wellness' },
  { value: 'ReproductiveHealth', label: 'Reproductive health (RH)' },
  { value: 'ChildWelfare', label: 'Child welfare' },
  { value: 'MaternalChildHealth', label: 'Maternal & child health (MCH)' },
  { value: 'Antenatal', label: 'Antenatal (ANC)' },
  { value: 'Postnatal', label: 'Postnatal (PNC)' },
  { value: 'FamilyPlanning', label: 'Family planning' },
  { value: 'ComprehensiveCareCentre', label: 'Comprehensive care (CCC)' },
  { value: 'Tuberculosis', label: 'TB clinic' },
  { value: 'Nutrition', label: 'Nutrition' },
  { value: 'Dental', label: 'Dental' },
  { value: 'Eye', label: 'Eye clinic' },
  { value: 'Ent', label: 'ENT' },
  { value: 'Physiotherapy', label: 'Physiotherapy / rehab' },
  { value: 'AdolescentYouthFriendly', label: 'Adolescent & youth friendly' },
];

const PRIORITY_STYLES: Record<QueuePriority, string> = {
  Routine: 'bg-slate-100 text-slate-600',
  Urgent: 'bg-amber-100 text-amber-700',
  Emergency: 'bg-red-100 text-red-700',
};

const STATUS_STYLES: Record<string, string> = {
  Waiting: 'bg-sky-100 text-sky-700',
  Accepted: 'bg-indigo-100 text-indigo-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-slate-100 text-slate-500',
};

/** Minutes since the entry was queued — the live wait indicator. */
function waitLabel(requestedAtUtc: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(requestedAtUtc).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function QueuePage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [clinic, setClinic] = useState('');
  const [status, setStatus] = useState('Waiting');
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canCreate = hasPermission(permissions, PERMISSIONS.QUEUE_CREATE);
  const canAccept = hasPermission(permissions, PERMISSIONS.QUEUE_ACCEPT);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await QueueService.list(clinic || undefined, status || undefined);
      setEntries(res.items);
      setTotal(res.totalCount);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, [clinic, status]);

  useEffect(() => {
    void load();
    // Live board: auto-refresh every 30s so reception and clinics stay in sync.
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
  }, [load]);

  const accept = async (entry: QueueEntry) => {
    setBusyId(entry.id);
    try {
      const res = await QueueService.accept(entry.id);
      toast.success(`Consultation registered for ${entry.patientName}`);
      await load();
      // Offer the clinician a one-tap jump into the workspace.
      if (confirm(`Consultation registered (${res.queueEntry.queueNumber}). Open it now?`)) {
        navigate('/consultations');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Accept failed');
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (entry: QueueEntry) => {
    if (!confirm(`Remove ${entry.patientName} (${entry.queueNumber}) from the queue?`)) return;
    setBusyId(entry.id);
    try {
      await QueueService.cancel(entry.id);
      toast.success('Queue entry cancelled');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Consultation queue</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString()} entr{total === 1 ? 'y' : 'ies'} · {status || 'all statuses'}{clinic ? ` · ${CLINIC_TYPES.find((c) => c.value === clinic)?.label ?? clinic}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-xs" onClick={() => void load()}>
            <RefreshCw size={13} className="mr-1" />
            Refresh
          </button>
          {canCreate && (
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={16} />
              Queue patient
            </button>
          )}
        </div>
      </div>

      {/* Clinic filter */}
      <div className="flex flex-wrap gap-1.5">
        <FilterChip label="All clinics" active={clinic === ''} onClick={() => setClinic('')} />
        {CLINIC_TYPES.map((c) => (
          <FilterChip key={c.value} label={c.label} active={clinic === c.value} onClick={() => setClinic(c.value)} />
        ))}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-1.5">
        {['Waiting', 'Accepted', 'Completed', 'Cancelled', ''].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatus(s)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              status === s
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-500 border-slate-200 hover:text-slate-900'
            }`}
          >
            {s || 'All statuses'}
          </button>
        ))}
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16">
          <Loader2 size={22} className="animate-spin text-indigo-600" />
          <p className="text-sm text-slate-400">Loading queue…</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Users size={30} className="text-slate-300" />
          <p className="text-sm text-slate-400 max-w-xs">
            No {status ? status.toLowerCase() : ''} queue entries{clinic ? ' for this clinic' : ''} right now.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {entries.map((e) => (
            <div key={e.id} className="card p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-lg font-bold text-indigo-700 leading-none">{e.queueNumber}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[e.priority]}`}>
                    {e.priority}
                  </span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[e.status] ?? 'bg-slate-100 text-slate-600'}`}>
                  {e.status}
                </span>
              </div>

              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">{e.patientName || '—'}</p>
                <p className="font-mono text-xs text-indigo-600">{e.patientNumber || '—'}</p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{CLINIC_TYPES.find((c) => c.value === e.clinicType)?.label ?? e.clinicType}</span>
                <span className="flex items-center gap-1">
                  <Clock size={11} /> {waitLabel(e.requestedAtUtc)}
                </span>
              </div>

              {e.notes && <p className="text-xs text-slate-500 bg-slate-50 rounded-md px-2.5 py-1.5">{e.notes}</p>}

              <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2 mt-auto">
                <span>Queued {formatDateTime(e.requestedAtUtc)}</span>
                {e.acceptedAtUtc && <span>Seen {formatDateTime(e.acceptedAtUtc)}</span>}
              </div>

              <div className="flex gap-2">
                {e.status === 'Waiting' && canAccept && (
                  <button
                    className="btn-primary text-xs py-1.5 flex-1"
                    disabled={busyId === e.id}
                    onClick={() => void accept(e)}
                  >
                    {busyId === e.id ? <Loader2 size={13} className="animate-spin mr-1" /> : <CheckCircle2 size={13} className="mr-1" />}
                    Accept & consult
                  </button>
                )}
                {e.status === 'Waiting' && canCreate && (
                  <button
                    className="btn-ghost text-xs py-1.5 text-red-600 border-red-200 hover:bg-red-50"
                    disabled={busyId === e.id}
                    onClick={() => void cancel(e)}
                  >
                    <XCircle size={13} className="mr-1" />
                    Cancel
                  </button>
                )}
                {e.status === 'Accepted' && (
                  <button className="btn-ghost text-xs py-1.5 flex-1" onClick={() => navigate('/consultations')}>
                    <Stethoscope size={13} className="mr-1" />
                    Open consultations
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && canCreate && (
        <QueuePatientModal
          onClose={() => setShowCreate(false)}
          onQueued={(entry) => {
            setShowCreate(false);
            toast.success(`${entry.patientName || 'Patient'} queued — ${entry.queueNumber}`);
            void load();
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
