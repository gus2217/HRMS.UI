import { useEffect, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Pill, PackageX } from 'lucide-react'
import {
  pharmacyApi,
  consultationApi,
  inventoryApi,
  patientApi,
  type PrescriptionDetail,
  type DrugCatalogDto,
  type StockLevelDto,
  type PatientSummary,
} from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { useAuthStore } from '@/store/authStore'

interface PrescriptionRow extends PrescriptionDetail {
  patientName?: string
}

export default function PharmacyPage() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [drugs, setDrugs] = useState<DrugCatalogDto[]>([])
  const [active, setActive] = useState<PrescriptionRow | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [stockRes, patientRes] = await Promise.all([
          inventoryApi.stockLevels().catch(() => [] as StockLevelDto[]),
          patientApi.search(undefined, 1, 20).catch(() => null),
        ])
        if (!mounted) return
        // Build drug catalog from stock levels (source of truth in this backend).
        setDrugs(
          stockRes.map((s) => ({
            id: s.drugId,
            code: s.drugCode,
            name: s.drugName,
            form: '',
            unitPrice: 0,
            reorderLevel: s.reorderLevel,
            status: 'Active',
          })),
        )
        // Seed recent prescriptions list from patients (no list endpoint).
        const rows: PrescriptionRow[] = (patientRes?.items ?? []).slice(0, 10).map((p: PatientSummary) => ({
          id: p.id,
          patientId: p.id,
          consultationId: '',
          prescribedByUserId: '',
          status: '—',
          prescribedAtUtc: p.lastVisitDate ?? p.dateOfBirth,
          items: [],
          patientName: p.fullName,
        }))
        setPrescriptions(rows)
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
          <h1 className="text-xl font-bold text-white tracking-tight">Pharmacy</h1>
          <p className="text-sm text-white/40 mt-0.5">Prescriptions & dispensing</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Pill size={16} />
          New prescription
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white">Recent prescriptions</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-14">
              <Loader2 size={20} className="animate-spin text-[#FFA500]" />
              <p className="text-sm text-white/40">Loading…</p>
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
                      <td className="font-medium text-white">{p.patientName}</td>
                      <td>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">{p.status}</span>
                      </td>
                      <td className="text-white/50">{formatDateTime(p.prescribedAtUtc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5 min-h-[300px]">
          <h2 className="text-sm font-semibold text-white mb-4">Prescription details</h2>
          {active && active.status !== '—' ? (
            <div className="space-y-3">
              <p className="text-xs text-white/40">Prescribed {formatDateTime(active.prescribedAtUtc)} · {active.status}</p>
              <div className="space-y-2">
                {active.items.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-white">{item.dosageInstructions}</p>
                      <span className="text-xs text-white/50">
                        {item.quantityDispensed}/{item.quantityPrescribed} dispensed
                      </span>
                    </div>
                    <p className="text-xs text-white/35 mt-1">{item.status}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <PackageX size={28} className="text-white/20" />
              <p className="text-sm text-white/40 max-w-xs">Select a prescription to view items and dispense.</p>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreatePrescriptionModal
          drugs={drugs}
          onClose={() => setShowCreate(false)}
          onCreated={(p) => {
            setShowCreate(false)
            toast.success('Prescription created')
            setActive({ ...p, patientName: p.patientId })
          }}
        />
      )}
    </div>
  )
}

// ─── Create prescription modal ───────────────────────────────────────────

function CreatePrescriptionModal({
  drugs,
  onClose,
  onCreated,
}: {
  drugs: DrugCatalogDto[]
  onClose: () => void
  onCreated: (p: PrescriptionDetail) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PatientSummary[]>([])
  const [selected, setSelected] = useState<PatientSummary | null>(null)
  const [lines, setLines] = useState([{ drugId: '', dosageInstructions: '', quantityPrescribed: 1 }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!query.trim()) {
        setResults([])
        return
      }
      patientApi
        .search(query.trim(), 1, 6)
        .then((res) => setResults(res.items))
        .catch(() => setResults([]))
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  const setLine = (index: number, patch: Partial<(typeof lines)[number]>) =>
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selected) {
      toast.error('Select a patient first.')
      return
    }
    const validLines = lines.filter((l) => l.drugId && l.quantityPrescribed > 0)
    if (validLines.length === 0) {
      toast.error('Add at least one drug line.')
      return
    }
    setSaving(true)
    try {
      // The backend requires a consultation context; start one for the patient.
      const consultation = await consultationApi.start(
        selected.id,
        useAuthStore.getState().user?.userId ?? '',
      )
      const res = await pharmacyApi.createPrescription({
        patientId: selected.id,
        consultationId: consultation.id,
        items: validLines.map((l) => ({
          drugId: l.drugId,
          dosageInstructions: l.dosageInstructions || 'As directed',
          quantityPrescribed: l.quantityPrescribed,
        })),
      })
      onCreated(res)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create prescription')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-[#0b1220] rounded-t-xl">
          <h2 className="text-sm font-semibold text-white">New prescription</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-sm">✕</button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Patient</label>
            <input
              className="input"
              placeholder="Search patient…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {results.length > 0 && (
              <ul className="mt-2 space-y-1">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(p)
                        setQuery('')
                        setResults([])
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm bg-white/[0.03] border border-white/[0.06] text-white/70 hover:bg-white/[0.06]"
                    >
                      {p.fullName} <span className="ml-2 font-mono text-xs text-[#FFA500]">{p.patientNumber}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selected && (
              <p className="text-xs text-emerald-400 mt-2">✓ {selected.fullName}</p>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Drug lines</p>
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_70px] gap-2">
                <select
                  className="input"
                  value={line.drugId}
                  onChange={(e) => setLine(index, { drugId: e.target.value })}
                >
                  <option value="">Select drug…</option>
                  {drugs.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
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
              className="text-xs font-medium text-[#FFA500] hover:text-[#ffb32e]"
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
  )
}

