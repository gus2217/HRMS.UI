import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Pill, PackageX } from 'lucide-react';
import { PatientService } from '@/features/patients/services/patientService';
import { InventoryService } from '@/features/inventory/services/inventoryService';
import type { PrescriptionDetail } from '../types/pharmacy';
import type { PatientSummary } from '@/features/patients/types/patient';
import type { StockLevelDto } from '@/features/inventory/types/inventory';
import { formatDateTime } from '@/lib/format';
import CreatePrescriptionModal from '../components/CreatePrescriptionModal';

interface PrescriptionRow extends PrescriptionDetail {
  patientName?: string;
}

export default function PharmacyPage() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [drugs, setDrugs] = useState<StockLevelDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [active, setActive] = useState<PrescriptionRow | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [stock, patients] = await Promise.all([
          InventoryService.stockLevels().catch(() => [] as StockLevelDto[]),
          PatientService.search(undefined, 1, 20).catch(() => null),
        ]);
        if (!mounted) return;
        setDrugs(stock);
        setPrescriptions(
          (patients?.items ?? []).slice(0, 10).map((p: PatientSummary) => ({
            id: p.id,
            patientId: p.id,
            consultationId: '',
            prescribedByUserId: '',
            status: '—',
            prescribedAtUtc: p.lastVisitDate ?? p.dateOfBirth,
            items: [],
            patientName: p.fullName,
          })),
        );
      } catch {
        /* tolerate */
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pharmacy</h1>
          <p className="text-sm text-slate-500 mt-0.5">Prescriptions & dispensing</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Pill size={16} />
          New prescription
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Recent prescriptions</h2>
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
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map((p) => (
                    <tr key={p.id} className="cursor-pointer" onClick={() => setActive(p)}>
                      <td className="font-medium text-slate-900">{p.patientName}</td>
                      <td>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{p.status}</span>
                      </td>
                      <td className="text-slate-500">{formatDateTime(p.prescribedAtUtc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5 min-h-[300px]">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Prescription details</h2>
          {active && active.status !== '—' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Prescribed {formatDateTime(active.prescribedAtUtc)} · {active.status}</p>
              <div className="space-y-2">
                {active.items.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-900">{item.dosageInstructions}</p>
                      <span className="text-xs text-slate-500">
                        {item.quantityDispensed}/{item.quantityPrescribed} dispensed
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{item.status}</p>
                  </div>
                ))}
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
          onCreated={(p) => {
            setShowCreate(false);
            toast.success('Prescription created');
            setActive({ ...p, patientName: p.patientId });
          }}
        />
      )}
    </div>
  );
}
