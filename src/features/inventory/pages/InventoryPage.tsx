import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Boxes, PackagePlus, AlertTriangle } from 'lucide-react';
import { InventoryService } from '../services/inventoryService';
import type { StockLevelDto, LowStockAlertDto, DrugCatalogDto } from '../types/inventory';
import { formatNumber } from '@/lib/format';

export default function InventoryPage() {
  const [stock, setStock] = useState<StockLevelDto[]>([]);
  const [lowStock, setLowStock] = useState<LowStockAlertDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrug, setShowDrug] = useState(false);
  const [showReceive, setShowReceive] = useState(false);

  // New drug modal state
  const [drugForm, setDrugForm] = useState({ code: '', name: '', form: 'Tablet', unitPrice: 0, reorderLevel: 10 });
  const [drugSaving, setDrugSaving] = useState(false);

  // Receive stock modal state
  const [recDrugId, setRecDrugId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [unitCost, setUnitCost] = useState(0);
  const [reference, setReference] = useState('');
  const [recSaving, setRecSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        InventoryService.stockLevels().catch(() => [] as StockLevelDto[]),
        InventoryService.lowStock().catch(() => [] as LowStockAlertDto[]),
      ]);
      setStock(s);
      setLowStock(l);
    } catch {
      /* tolerate */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createDrug = async () => {
    if (!drugForm.code.trim() || !drugForm.name.trim()) {
      toast.error('Code and name are required.');
      return;
    }
    setDrugSaving(true);
    try {
      const res: DrugCatalogDto = await InventoryService.createDrug({
        code: drugForm.code.trim(),
        name: drugForm.name.trim(),
        form: drugForm.form,
        unitPrice: drugForm.unitPrice,
        reorderLevel: drugForm.reorderLevel,
      });
      toast.success(`${res.name} created`);
      setShowDrug(false);
      setDrugForm({ code: '', name: '', form: 'Tablet', unitPrice: 0, reorderLevel: 10 });
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create drug');
    } finally {
      setDrugSaving(false);
    }
  };

  const receiveStock = async () => {
    if (!recDrugId || !batchNumber.trim() || !expiryDate) {
      toast.error('Drug, batch number and expiry date are required.');
      return;
    }
    setRecSaving(true);
    try {
      const res = await InventoryService.receiveStock({
        drugId: recDrugId,
        batchNumber: batchNumber.trim(),
        quantity,
        expiryDate: new Date(expiryDate).toISOString(),
        unitCost,
        reference: reference.trim() || null,
      });
      toast.success(`Received ${res.quantityOnHand} units of batch ${res.batchNumber}`);
      setShowReceive(false);
      setRecDrugId('');
      setBatchNumber('');
      setQuantity(1);
      setExpiryDate('');
      setUnitCost(0);
      setReference('');
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to receive stock');
    } finally {
      setRecSaving(false);
    }
  };

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Inventory</h1>
          <p className="text-sm text-slate-500 mt-0.5">Drug catalog & stock levels</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setShowDrug(true)}>
            <PackagePlus size={16} />
            New drug
          </button>
          <button className="btn-primary" onClick={() => setShowReceive(true)}>
            <Boxes size={16} />
            Receive stock
          </button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-3">
          <AlertTriangle size={17} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-amber-700">{lowStock.length} item{lowStock.length === 1 ? '' : 's'} below reorder level</p>
            <p className="text-slate-600 mt-0.5">{lowStock.map((l) => l.drugName).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16">
            <Loader2 size={20} className="animate-spin text-indigo-600" />
            <p className="text-sm text-slate-400">Loading inventory…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Drug</th>
                  <th>Code</th>
                  <th className="text-right">On hand</th>
                  <th className="text-right">Reorder level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((s) => {
                  const low = s.quantityOnHand <= s.reorderLevel;
                  return (
                    <tr key={s.drugId}>
                      <td className="font-medium text-slate-900">{s.drugName}</td>
                      <td className="font-mono text-xs text-slate-400">{s.drugCode}</td>
                      <td className="text-right font-semibold">{formatNumber(s.quantityOnHand)}</td>
                      <td className="text-right text-slate-500">{formatNumber(s.reorderLevel)}</td>
                      <td>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          low ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {low ? 'Low' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {stock.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">No stock records.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDrug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowDrug(false)}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">New drug</h2>
              <button onClick={() => setShowDrug(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Code</label>
                  <input className="input" placeholder="e.g. AMOX-500" value={drugForm.code} onChange={(e) => setDrugForm((f) => ({ ...f, code: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Form</label>
                  <select className="input" value={drugForm.form} onChange={(e) => setDrugForm((f) => ({ ...f, form: e.target.value }))}>
                    {['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Inhaler'].map((x) => <option key={x}>{x}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Name</label>
                <input className="input" placeholder="e.g. Amoxicillin 500mg" value={drugForm.name} onChange={(e) => setDrugForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Unit price (KES)</label>
                  <input type="number" min={0} className="input" value={drugForm.unitPrice || ''} onChange={(e) => setDrugForm((f) => ({ ...f, unitPrice: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Reorder level</label>
                  <input type="number" min={0} className="input" value={drugForm.reorderLevel} onChange={(e) => setDrugForm((f) => ({ ...f, reorderLevel: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button className="btn-ghost" onClick={() => setShowDrug(false)}>Cancel</button>
                <button className="btn-primary" disabled={drugSaving} onClick={() => void createDrug()}>
                  {drugSaving && <Loader2 size={15} className="animate-spin" />}
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowReceive(false)}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">Receive stock</h2>
              <button onClick={() => setShowReceive(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Drug</label>
                <select className="input" value={recDrugId} onChange={(e) => setRecDrugId(e.target.value)}>
                  <option value="">Select drug…</option>
                  {stock.map((s) => (
                    <option key={s.drugId} value={s.drugId}>{s.drugName} ({s.drugCode})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Batch number</label>
                  <input className="input" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Expiry date</label>
                  <input type="date" className="input" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Quantity</label>
                  <input type="number" min={1} className="input" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Unit cost (KES)</label>
                  <input type="number" min={0} className="input" value={unitCost || ''} onChange={(e) => setUnitCost(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Reference (optional)</label>
                <input className="input" placeholder="GRN / invoice no." value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button className="btn-ghost" onClick={() => setShowReceive(false)}>Cancel</button>
                <button className="btn-primary" disabled={recSaving} onClick={() => void receiveStock()}>
                  {recSaving && <Loader2 size={15} className="animate-spin" />}
                  Receive
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
