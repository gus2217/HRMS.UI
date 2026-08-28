// ============================================================
// CreatePrescriptionModal.tsx
// Location: src/features/pharmacy/components/CreatePrescriptionModal.tsx
// ============================================================

import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { PharmacyService } from '../services/pharmacyService';
import { ConsultationService } from '@/features/consultations/services/consultationService';
import { PatientService } from '@/features/patients/services/patientService';
import type { PrescriptionDetail } from '../types/pharmacy';
import type { PatientSummary } from '@/features/patients/types/patient';
import type { StockLevelDto } from '@/features/inventory/types/inventory';
import { useAuth } from '@/features/auth/components/AuthContext';

interface Props {
  drugs: StockLevelDto[];
  onClose: () => void;
  onCreated: (p: PrescriptionDetail) => void;
}

interface Line {
  drugId: string;
  dosageInstructions: string;
  quantityPrescribed: number;
}

export default function CreatePrescriptionModal({ drugs, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientSummary[]>([]);
  const [selected, setSelected] = useState<PatientSummary | null>(null);
  const [lines, setLines] = useState<Line[]>([{ drugId: '', dosageInstructions: '', quantityPrescribed: 1 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      PatientService.search(query.trim(), 1, 6)
        .then((res) => setResults(res.items))
        .catch(() => setResults([]));
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const setLine = (index: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) {
      toast.error('Select a patient first.');
      return;
    }
    const validLines = lines.filter((l) => l.drugId && l.quantityPrescribed > 0);
    if (validLines.length === 0) {
      toast.error('Add at least one drug line.');
      return;
    }
    setSaving(true);
    try {
      // The backend requires a consultation context; start one for the patient.
      const consultation = await ConsultationService.start(selected.id, user?.id ?? '');
      const res = await PharmacyService.createPrescription({
        patientId: selected.id,
        consultationId: consultation.id,
        items: validLines.map((l) => ({
          drugId: l.drugId,
          dosageInstructions: l.dosageInstructions || 'As directed',
          quantityPrescribed: l.quantityPrescribed,
        })),
      });
      onCreated(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create prescription');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-sm font-semibold text-slate-900">New prescription</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Patient</label>
            <input className="input" placeholder="Search patient…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
                      className="w-full text-left px-3 py-2 rounded-lg text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      {p.fullName} <span className="ml-2 font-mono text-xs text-indigo-600">{p.patientNumber}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selected && <p className="text-xs text-emerald-600 mt-2">✓ {selected.fullName}</p>}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Drug lines</p>
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_70px] gap-2">
                <select className="input" value={line.drugId} onChange={(e) => setLine(index, { drugId: e.target.value })}>
                  <option value="">Select drug…</option>
                  {drugs.map((d) => (
                    <option key={d.drugId} value={d.drugId}>{d.drugName} ({d.drugCode})</option>
                  ))}
                </select>
                <input
                  className="input"
                  placeholder="Dosage instructions"
                  value={line.dosageInstructions}
                  onChange={(e) => setLine(index, { dosageInstructions: e.target.value })}
                />
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={line.quantityPrescribed}
                  onChange={(e) => setLine(index, { quantityPrescribed: Number(e.target.value) })}
                />
              </div>
            ))}
            <button
              type="button"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              onClick={() => setLines((ls) => [...ls, { drugId: '', dosageInstructions: '', quantityPrescribed: 1 }])}
            >
              + Add line
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
