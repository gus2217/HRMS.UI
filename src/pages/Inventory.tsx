import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Boxes, PackagePlus, AlertTriangle } from 'lucide-react'
import {
  inventoryApi,
  type StockLevelDto,
  type LowStockAlertDto,
  type DrugCatalogDto,
} from '@/lib/api'
import { formatNumber } from '@/lib/format'

export default function InventoryPage() {
  const [stock, setStock] = useState<StockLevelDto[]>([])
  const [lowStock, setLowStock] = useState<LowStockAlertDto[]>([])
  const [loading, setLoading] = useState(true)
  const [showDrug, setShowDrug] = useState(false)
  const [showReceive, setShowReceive] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [s, l] = await Promise.all([
          inventoryApi.stockLevels().catch(() => [] as StockLevelDto[]),
          inventoryApi.lowStock().catch(() => [] as LowStockAlertDto[]),
        ])
        if (!mounted) return
        setStock(s)
        setLowStock(l)
      } catch {
        /* tolerate */
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Inventory</h1>
          <p className="text-sm text-white/40 mt-0.5">Drug catalog & stock levels</p>
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
        <div className="p-4 rounded-xl border border-[#FFA500]/25 bg-[#FFA500]/[0.06] flex items-start gap-3">
          <AlertTriangle size={17} className="text-[#FFA500] mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-[#FFA500]">{lowStock.length} item{lowStock.length === 1 ? '' : 's'} below reorder level</p>
            <p className="text-white/60 mt-0.5">{lowStock.map((l) => l.drugName).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16">
            <Loader2 size={20} className="animate-spin text-[#FFA500]" />
            <p className="text-sm text-white/40">Loading inventory…</p>
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
                  const low = s.quantityOnHand <= s.reorderLevel
                  return (
                    <tr key={s.drugId}>
                      <td className="font-medium text-white">{s.drugName}</td>
                      <td className="font-mono text-xs text-white/45">{s.drugCode}</td>
                      <td className="text-right font-semibold">{formatNumber(s.quantityOnHand)}</td>
                      <td className="text-right text-white/50">{formatNumber(s.reorderLevel)}</td>
                      <td>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          low ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
                        }`}>
                          {low ? 'Low' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {stock.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-white/35">No stock records.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDrug && <NewDrugModal onClose={() => setShowDrug(false)} onCreated={() => window.location.reload()} />}
      {showReceive && <ReceiveStockModal stock={stock} onClose={() => setShowReceive(false)} onReceived={() => window.location.reload()} />}
    </div>
  )
}

// ─── New drug modal ──────────────────────────────────────────────────────

function NewDrugModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ code: '', name: '', form: 'Tablet', unitPrice: 0, reorderLevel: 10 })
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Code and name are required.')
      return
    }
    setSaving(true)
    try {
      const res: DrugCatalogDto = await inventoryApi.createDrug({
        code: form.code.trim(),
        name: form.name.trim(),
        form: form.form,
        unitPrice: form.unitPrice,
        reorderLevel: form.reorderLevel,
      })
      toast.success(`${res.name} created`)
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create drug')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">New drug</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-sm">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Code</label>
              <input className="input" placeholder="e.g. AMOX-500" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Form</label>
              <select className="input" value={form.form} onChange={(e) => setForm((f) => ({ ...f, form: e.target.value }))}>
                {['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Inhaler'].map((x) => <option key={x}>{x}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Name</label>
            <input className="input" placeholder="e.g. Amoxicillin 500mg" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Unit price (KES)</label>
              <input type="number" min={0} className="input" value={form.unitPrice || ''} onChange={(e) => setForm((f) => ({ ...f, unitPrice: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Reorder level</label>
              <input type="number" min={0} className="input" value={form.reorderLevel} onChange={(e) => setForm((f) => ({ ...f, reorderLevel: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={saving} onClick={() => void submit()}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Receive stock modal ─────────────────────────────────────────────────

function ReceiveStockModal({
  stock,
  onClose,
  onReceived,
}: {
  stock: StockLevelDto[]
  onClose: () => void
  onReceived: () => void
}) {
  const [drugId, setDrugId] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [expiryDate, setExpiryDate] = useState('')
  const [unitCost, setUnitCost] = useState(0)
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!drugId || !batchNumber.trim() || !expiryDate) {
      toast.error('Drug, batch number and expiry date are required.')
      return
    }
    setSaving(true)
    try {
      const res = await inventoryApi.receiveStock({
        drugId,
        batchNumber: batchNumber.trim(),
        quantity,
        expiryDate: new Date(expiryDate).toISOString(),
        unitCost,
        reference: reference.trim() || null,
      })
      toast.success(`Received ${res.quantityOnHand} units of batch ${res.batchNumber}`)
      onReceived()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to receive stock')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Receive stock</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-sm">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Drug</label>
            <select className="input" value={drugId} onChange={(e) => setDrugId(e.target.value)}>
              <option value="">Select drug…</option>
              {stock.map((s) => (
                <option key={s.drugId} value={s.drugId}>{s.drugName} ({s.drugCode})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Batch number</label>
              <input className="input" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Expiry date</label>
              <input type="date" className="input" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Quantity</label>
              <input type="number" min={1} className="input" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Unit cost (KES)</label>
              <input type="number" min={0} className="input" value={unitCost || ''} onChange={(e) => setUnitCost(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Reference (optional)</label>
            <input className="input" placeholder="GRN / invoice no." value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={saving} onClick={() => void submit()}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Receive
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
