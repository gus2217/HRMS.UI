// ============================================================
// WardManageModal.tsx
// Location: src/features/inpatient/components/WardManageModal.tsx
//
// Admin: create / edit / deactivate wards (name, type, bed count).
// ============================================================

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Plus, Pencil, Power } from 'lucide-react';
import { InpatientService } from '../services/inpatientService';
import type { WardDto, WardType } from '../types/inpatient';

interface Props {
  onClose: () => void;
  onChanged: () => void;
}

const WARD_TYPES: { value: WardType; label: string }[] = [
  { value: 'General', label: 'General ward' },
  { value: 'Maternity', label: 'Maternity' },
  { value: 'Pediatric', label: 'Pediatric' },
  { value: 'Surgical', label: 'Surgical' },
  { value: 'Icu', label: 'ICU' },
  { value: 'Isolation', label: 'Isolation' },
  { value: 'Private', label: 'Private' },
  { value: 'Recovery', label: 'Recovery' },
];

export default function WardManageModal({ onClose, onChanged }: Props) {
  const [wards, setWards] = useState<WardDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/edit form
  const [editing, setEditing] = useState<WardDto | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<WardType>('General');
  const [totalBeds, setTotalBeds] = useState('20');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setWards(await InpatientService.wards(false));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load wards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const startCreate = () => {
    setEditing(null);
    setName('');
    setType('General');
    setTotalBeds('20');
  };

  const startEdit = (w: WardDto) => {
    setEditing(w);
    setName(w.name);
    setType(w.type);
    setTotalBeds(String(w.totalBeds));
  };

  const save = async () => {
    if (!name.trim()) return toast.error('Ward name is required');
    const beds = parseInt(totalBeds, 10);
    if (!beds || beds <= 0) return toast.error('Bed count must be a positive number');
    setSaving(true);
    try {
      if (editing) {
        await InpatientService.updateWard(editing.id, { name: name.trim(), type, totalBeds: beds });
        toast.success('Ward updated');
      } else {
        await InpatientService.createWard({ name: name.trim(), type, totalBeds: beds });
        toast.success('Ward created');
      }
      startCreate();
      await load();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save ward');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (w: WardDto) => {
    try {
      await InpatientService.deactivateWard(w.id);
      toast.success(`${w.name} deactivated`);
      await load();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to deactivate ward');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-sm font-semibold text-slate-900">Manage wards</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        <div className="p-5 space-y-6">
          {/* Create/edit form */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
            <p className="text-xs font-semibold text-indigo-900">{editing ? `Edit ${editing.name}` : 'New ward'}</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Name</label>
                <input className="input" placeholder="e.g. General Ward" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Type</label>
                <select className="input" value={type} onChange={(e) => setType(e.target.value as WardType)}>
                  {WARD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Total beds</label>
                <input className="input" type="number" min={1} value={totalBeds} onChange={(e) => setTotalBeds(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              {editing && <button className="btn-ghost text-xs" onClick={startCreate}>Cancel edit</button>}
              <button className="btn-primary !py-1.5 text-xs" disabled={saving} onClick={() => void save()}>
                {saving && <Loader2 size={13} className="animate-spin" />}
                {editing ? 'Save changes' : 'Create ward'}
              </button>
            </div>
          </div>

          {/* Ward list */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm">
              <Loader2 size={16} className="animate-spin text-indigo-600" /> Loading…
            </div>
          ) : wards.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No wards yet — create the first one above.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {wards.map((w) => (
                <li key={w.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                      {w.name}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{w.type}</span>
                      {!w.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">Inactive</span>}
                    </p>
                    <p className="text-xs text-slate-400">{w.totalBeds} beds</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" onClick={() => startEdit(w)} title="Edit"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                      <Pencil size={14} />
                    </button>
                    {w.isActive && (
                      <button type="button" onClick={() => void deactivate(w)} title="Deactivate"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Power size={14} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <button type="button" onClick={startCreate}
            className="w-full text-xs font-medium text-indigo-600 hover:text-indigo-800 inline-flex items-center justify-center gap-1">
            <Plus size={13} /> New ward
          </button>
        </div>
      </div>
    </div>
  );
}
