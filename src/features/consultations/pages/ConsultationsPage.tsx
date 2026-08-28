import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Plus, Stethoscope } from 'lucide-react';
import { ConsultationService } from '../services/consultationService';
import { PatientService } from '@/features/patients/services/patientService';
import type { ConsultationDetail } from '../types/consultation';
import type { PatientSummary } from '@/features/patients/types/patient';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/features/auth/components/AuthContext';
import StartConsultationModal from '../components/StartConsultationModal';
import ConsultationDetailView from '../components/ConsultationDetailView';

interface ConsultationRow extends ConsultationDetail {
  patientName?: string;
  patientNumber?: string;
}

export default function ConsultationsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ConsultationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStart, setShowStart] = useState(false);
  const [active, setActive] = useState<ConsultationRow | null>(null);
  const [activeLoading, setActiveLoading] = useState(false);

  // The API has no "list consultations" endpoint; surface recent patients as
  // the working queue. Selecting one loads (or starts) its consultation.
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await PatientService.search(undefined, 1, 50);
        if (!mounted) return;
        const seeded: ConsultationRow[] = res.items.slice(0, 10).map((p: PatientSummary) => ({
          id: p.id,
          patientId: p.id,
          clinicianUserId: user?.id ?? '',
          status: '—',
          startedAtUtc: p.lastVisitDate ?? p.dateOfBirth,
          completedAtUtc: null,
          patientName: p.fullName,
          patientNumber: p.patientNumber,
          triage: null,
          diagnoses: [],
          notes: [],
        }));
        setRows(seeded);
      } catch {
        /* keep empty */
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const openConsultation = async (row: ConsultationRow) => {
    setActiveLoading(true);
    setActive(row);
    try {
      const detail = await ConsultationService.detail(row.id);
      setActive({ ...row, ...detail });
    } catch {
      toast.error('This patient has no active consultation yet — start one.');
      setActive(null);
    } finally {
      setActiveLoading(false);
    }
  };

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Consultations</h1>
          <p className="text-sm text-slate-500 mt-0.5">Start and work patient consultations</p>
        </div>
        <button className="btn-primary" onClick={() => setShowStart(true)}>
          <Plus size={16} />
          Start consultation
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Working queue */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
            <Stethoscope size={15} className="text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">Recent patients</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-14">
              <Loader2 size={20} className="animate-spin text-indigo-600" />
              <p className="text-sm text-slate-400">Loading…</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>No.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className="cursor-pointer" onClick={() => void openConsultation(c)}>
                      <td className="font-medium text-slate-900">{c.patientName}</td>
                      <td className="font-mono text-xs text-indigo-600">{c.patientNumber}</td>
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
              consultation={active}
              onChanged={(updated) => setActive((prev) => (prev ? { ...prev, ...updated } : prev))}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Stethoscope size={28} className="text-slate-300" />
              <p className="text-sm text-slate-400 max-w-xs">Select a patient to view or work their consultation.</p>
            </div>
          )}
        </div>
      </div>

      {showStart && (
        <StartConsultationModal
          onClose={() => setShowStart(false)}
          onStarted={(c) => {
            setShowStart(false);
            setActive({ ...c, patientName: c.patientId, patientNumber: '' });
          }}
        />
      )}
    </div>
  );
}

export { formatDateTime };
