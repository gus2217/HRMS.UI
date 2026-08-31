// ============================================================
// CreatePrescriptionModal.tsx
// Location: src/features/pharmacy/components/CreatePrescriptionModal.tsx
//
// Prescriptions must attach to a real consultation (backend requires
// consultationId). The modal resolves the patient's latest active
// consultation from their clinical history and refuses to invent one —
// the clinician starts the consultation in the Consultations page.
// ============================================================

import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Stethoscope } from 'lucide-react';
import { PharmacyService } from '../services/pharmacyService';
import { ConsultationService } from '@/features/consultations/services/consultationService';
import { PatientService } from '@/features/patients/services/patientService';
import type { PrescriptionDetail } from '../types/pharmacy';
import type { PatientSummary } from '@/features/patients/types/patient';
import type { DrugCatalogDto } from '@/features/inventory/types/inventory';

interface Props {
  drugs: DrugCatalogDto[];
  onClose: () => void;
  onCreated: (p: PrescriptionDetail) => void;
}

interface Line {
  drugId: string;
  dosageInstructions: string;
  route: string;
  frequency: string;
  durationDays: string;
  quantityPrescribed: number;
}

export default function CreatePrescriptionModal({ drugs, onClose, onCreated }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientSummary[]>([]);
  const [selected, setSelected] = useState<PatientSummary | null>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [consultationStatus, setConsultationStatus] = useState('');
  const [resolving, setResolving] = useState(false);
  const [lines, setLines] = useState<Line[]>([{ drugId: '', dosageInstructions: '', route: 'Oral', frequency: '', durationDays: '', quantityPrescribed: 1 }]);
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

  // When a patient is picked, resolve their latest active consultation.
  useEffect(() => {
    if (!selected) {
      setConsultationId(null);
      setConsultationStatus('');
      return;
    }
    let mounted = true;
    setResolving(true);
    ConsultationService.history(selected.id)
      .then((history) => {
        if (!mounted) return;
        const active = history.consultations.find((c) => c.status !== 'Completed');
        const latest = active ?? history.consultations[0] ?? null;
        setConsultationId(latest?.id ?? null);
        setConsultationStatus(latest?.status ?? '');
      })
      .catch(() => {
        if (mounted) {
          setConsultationId(null);
          setConsultationStatus('');
        }
      })
      .finally(() => {
        if (mounted) setResolving(false);
      });
    return () => {
      mounted = false;
    };
  }, [selected]);

  const setLine = (index: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) {
      toast.error('Select a patient first.');
      return;
    }
    if (!consultationId) {
      toast.error('This patient has no consultation yet — start one from Consultations first.');
      return;
    }
    const validLines = lines.filter((l) => l.drugId && l.quantityPrescribed > 0);
    if (validLines.length === 0) {
      toast.error('Add at least one drug line.');
      return;
    }
    setSaving(true);
    try {
      const res = await PharmacyService.createPrescription({
        patientId: selected.id,
        consultationId,
        items: validLines.map((l) => ({
          drugId: l.drugId,
          dosageInstructions: l.dosageInstructions || 'As directed',
          route: l.route || 'Oral',
          frequency: l.frequency || '',
          durationDays: l.durationDays ? Number(l.durationDays) : null,
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

          {/* Consultation context */}
          {selected && (
            <div className={`p-3 rounded-lg border text-sm ${consultationId ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              {resolving ? (
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 size={13} className="animate-spin" /> Resolving consultation…
                </span>
              ) : consultationId ? (
                <span className="flex items-center gap-2 text-xs text-emerald-700">
                  <Stethoscope size={13} />
                  Attaching to {consultationStatus === 'Completed' ? 'latest consultation' : `active consultation (${consultationStatus})`}
                </span>
              ) : (
                <span className="flex items-center gap-2 text-xs text-amber-700">
                  <Stethoscope size={13} />
                  No consultation on record — start one from Consultations first.
                </span>
              )}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Drug lines</p>
            {lines.map((line, index) => (
              <div key={index} className="space-y-1.5">
                <div className="grid grid-cols-[1fr_1fr_70px] gap-2">
                  <select className="input" value={line.drugId} onChange={(e) => setLine(index, { drugId: e.target.value })}>
                    <option value="">Select drug…</option>
                    {drugs.map((d) => (
                      <option key={d.id} value={d.id} disabled={d.availableQuantity <= 0}>
                        {d.name} ({d.code}) · {d.category} · {d.form}
                        {d.availableQuantity <= 0 ? ' · out of stock' : ` · ${d.availableQuantity} available`}
                      </option>
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
                <div className="grid grid-cols-3 gap-2">
                  <select className="input text-xs py-1.5" value={line.route} onChange={(e) => setLine(index, { route: e.target.value })}>
                    <option>Oral</option>
                    <option>IV</option>
                    <option>IM</option>
                    <option>Subcutaneous</option>
                    <option>Topical</option>
                    <option>Inhalation</option>
                    <option>Ophthalmic</option>
                    <option>Otic</option>
                    <option>Rectal</option>
                    <option>Vaginal</option>
                  </select>
                  <input className="input text-xs py-1.5" placeholder="Frequency (e.g. Twice daily)" value={line.frequency} onChange={(e) => setLine(index, { frequency: e.target.value })} />
                  <input type="number" min={1} className="input text-xs py-1.5" placeholder="Duration (days)" value={line.durationDays} onChange={(e) => setLine(index, { durationDays: e.target.value })} />
                </div>
              </div>
            ))}
            <button
              type="button"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              onClick={() => setLines((ls) => [...ls, { drugId: '', dosageInstructions: '', route: 'Oral', frequency: '', durationDays: '', quantityPrescribed: 1 }])}
            >
              + Add line
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving || !consultationId}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
