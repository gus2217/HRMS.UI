// ============================================================
// StartConsultationModal.tsx
// Location: src/features/consultations/components/StartConsultationModal.tsx
// ============================================================

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { ConsultationService } from '../services/consultationService';
import { PatientService } from '@/features/patients/services/patientService';
import type { ConsultationDetail } from '../types/consultation';
import type { PatientSummary } from '@/features/patients/types/patient';
import { useAuth } from '@/features/auth/components/AuthContext';

interface Props {
  onClose: () => void;
  onStarted: (c: ConsultationDetail, patient: PatientSummary) => void;
}

export default function StartConsultationModal({ onClose, onStarted }: Props) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientSummary[]>([]);
  const [selected, setSelected] = useState<PatientSummary | null>(null);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      PatientService.search(query.trim(), 1, 8)
        .then((res) => setResults(res.items))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const start = async () => {
    if (!selected) return;
    setStarting(true);
    try {
      const c = await ConsultationService.start(selected.id, user?.id ?? '');
      toast.success(`Consultation started for ${selected.fullName}`);
      onStarted(c, selected);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start consultation');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Start consultation</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Find patient</label>
            <input
              className="input"
              placeholder="Search by name, number, phone or ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {searching && <p className="text-xs text-slate-400 mt-2">Searching…</p>}
            {results.length > 0 && (
              <ul className="mt-2 space-y-1">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(p);
                        setQuery('');
                        setResults([]);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                        selected?.id === p.id
                          ? 'bg-indigo-50 border-indigo-300 text-slate-900'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-medium">{p.fullName}</span>
                      <span className="ml-2 font-mono text-xs text-indigo-600">{p.patientNumber}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selected && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
              <p className="font-medium text-slate-900">{selected.fullName}</p>
              <p className="text-xs text-slate-400 mt-0.5">Clinician: {user?.fullName}</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={!selected || starting} onClick={() => void start()}>
              {starting && <Loader2 size={15} className="animate-spin" />}
              Start
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
