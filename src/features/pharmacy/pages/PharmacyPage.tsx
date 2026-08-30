import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Pill, PackageX, CheckCircle2 } from 'lucide-react';
import { PharmacyService } from '../services/pharmacyService';
import { InventoryService } from '@/features/inventory/services/inventoryService';
import type { PrescriptionDetail, PrescriptionListItem } from '../types/pharmacy';
import type { DrugCatalogDto } from '@/features/inventory/types/inventory';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import CreatePrescriptionModal from '../components/CreatePrescriptionModal';

interface PrescriptionRow extends PrescriptionListItem {
  detail?: PrescriptionDetail;
}

const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700',
  PartiallyDispensed: 'bg-sky-100 text-sky-700',
  FullyDispensed: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-red-100 text-red-700',
};

export default function PharmacyPage() {
  const { permissions } = useAuth();
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [drugs, setDrugs] = useState<DrugCatalogDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [active, setActive] = useState<PrescriptionRow | null>(null);
  const [activeLoading, setActiveLoading] = useState(false);

  const canDispense = hasPermission(permissions, PERMISSIONS.PHARMACY_DISPENSE);
  const canPrescribe = hasPermission(permissions, PERMISSIONS.CLINICAL_RECORD_DIAGNOSIS);

  const load = async (pageNumber: number) => {
    setLoading(true);
    try {
      const [list, catalog] = await Promise.all([
        PharmacyService.list(pageNumber, 20),
        InventoryService.catalog().catch(() => null),
      ]);
      setPrescriptions(list.items);
      setTotal(list.totalCount);
      setDrugs(catalog?.items ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(page);
  }, [page]);

  const open = async (row: PrescriptionRow) => {
    setActiveLoading(true);
    setActive(row);
    try {
      const detail = await PharmacyService.detail(row.id);
      setActive({ ...row, detail });
    } catch {
      setActive({ ...row, detail: undefined });
    } finally {
      setActiveLoading(false);
    }
  };

  const dispense = async (prescriptionId: string, itemId: string, quantity: number) => {
    try {
      await PharmacyService.dispense({ prescriptionId, prescriptionItemId: itemId, quantity });
      const detail = await PharmacyService.detail(prescriptionId);
      setActive((prev) => (prev ? { ...prev, detail } : prev));
      void load(page);
      toast.success('Dispensed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Dispense failed');
    }
  };

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pharmacy</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString()} prescriptions</p>
        </div>
        {canPrescribe && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Pill size={16} />
            New prescription
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Prescriptions</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-14">
              <Loader2 size={20} className="animate-spin text-indigo-600" />
              <p className="text-sm text-slate-400">Loading…</p>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <PackageX size={28} className="text-slate-300" />
              <p className="text-sm text-slate-400 max-w-xs">No prescriptions yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map((p) => (
                    <tr key={p.id} className="cursor-pointer" onClick={() => void open(p)}>
                      <td>
                        <p className="font-medium text-slate-900">{p.patientName}</p>
                        <p className="font-mono text-xs text-indigo-600">{p.patientNumber}</p>
                      </td>
                      <td>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="text-slate-500 text-xs">{formatDateTime(p.prescribedAtUtc)}</td>
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

        <div className="card p-5 min-h-[300px]">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Prescription details</h2>
          {activeLoading ? (
            <div className="flex items-center justify-center gap-3 py-16">
              <Loader2 size={20} className="animate-spin text-indigo-600" />
              <p className="text-sm text-slate-400">Loading…</p>
            </div>
          ) : active && active.detail ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{active.patientName}</p>
                  <p className="text-xs text-slate-400">Prescribed {formatDateTime(active.detail.prescribedAtUtc)}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLES[active.detail.status] ?? 'bg-slate-100 text-slate-600'}`}>
                  {active.detail.status}
                </span>
              </div>
              <div className="space-y-2">
                {active.detail.items.map((item) => {
                  const remaining = item.quantityPrescribed - item.quantityDispensed;
                  const done = remaining <= 0;
                  return (
                    <div key={item.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{item.dosageInstructions}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {item.quantityDispensed}/{item.quantityPrescribed} dispensed · {item.status}
                          </p>
                        </div>
                        {canDispense && !done && active.detail?.status !== 'Cancelled' && (
                          <button
                            className="btn-ghost text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 shrink-0"
                            onClick={() => void dispense(active.detail!.id, item.id, remaining)}
                          >
                            <CheckCircle2 size={13} />
                            Dispense {remaining}
                          </button>
                        )}
                        {done && (
                          <span className="text-xs font-medium text-emerald-600 shrink-0">✓ Complete</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <PackageX size={28} className="text-slate-300" />
              <p className="text-sm text-slate-400 max-w-xs">Select a prescription to view items and dispense.</p>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreatePrescriptionModal
          drugs={drugs}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            toast.success('Prescription created');
            void load(page);
          }}
        />
      )}
    </div>
  );
}
