import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, BedDouble, DoorOpen } from 'lucide-react'
import {
  inpatientApi,
  patientApi,
  type AdmissionDetail,
  type WardOccupancyDto,
  type PatientSummary,
} from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { useAuthStore } from '@/store/authStore'

interface AdmissionRow extends AdmissionDetail {
  patientName?: string
}

export default function WardsPage() {
  const [occupancy, setOccupancy] = useState<WardOccupancyDto[]>([])
  const [admissions, setAdmissions] = useState<AdmissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdmit, setShowAdmit] = useState(false)
  const [active, setActive] = useState<AdmissionRow | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [occ, patients] = await Promise.all([
          inpatientApi.wardOccupancy().catch(() => [] as WardOccupancyDto[]),
          patientApi.search(undefined, 1, 20).catch(() => null),
        ])
        if (!mounted) return
        setOccupancy(occ)
        setAdmissions(
          (patients?.items ?? []).slice(0, 10).map((p: PatientSummary) => ({
            id: p.id,
            patientId: p.id,
            admittingClinicianUserId: '',
            wardName: '—',
            bedNumber: '—',
            status: '—',
            admittedAtUtc: p.lastVisitDate ?? p.dateOfBirth,
            dischargedAtUtc: null,
            notes: [],
            patientName: p.fullName,
          })),
        )
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

  const open = async (a: AdmissionRow) => {
    try {
      const detail = await inpatientApi.detail(a.id)
      setActive({ ...a, ...detail })
    } catch {
      toast.error('No admission for this patient yet — admit them.')
      setActive(null)
    }
  }

  const discharge = async () => {
    if (!active || active.status === '—') return
    setBusy(true)
    try {
      const updated = await inpatientApi.discharge(active.id)
      setActive(updated)
      toast.success('Patient discharged')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Discharge failed')
    } finally {
      setBusy(false)
    }
  }

  const addNote = async (content: string) => {
    if (!active || !content.trim()) return
    setBusy(true)
    try {
      const updated = await inpatientApi.addNote(active.id, content.trim())
      setActive(updated)
      toast.success('Ward note added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add note')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Wards & Admissions</h1>
          <p className="text-sm text-white/40 mt-0.5">Occupancy, admissions and discharge</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdmit(true)}>
          <DoorOpen size={16} />
          Admit patient
        </button>
      </div>

      {/* Occupancy */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {occupancy.map((w) => {
          const pct = w.totalBeds > 0 ? Math.round((w.occupiedBeds / w.totalBeds) * 100) : 0
          return (
            <div key={w.wardName} className="card p-4">
              <p className="text-xs font-medium text-white/50 truncate">{w.wardName}</p>
              <p className="text-xl font-bold text-white mt-1">
                {w.occupiedBeds}<span className="text-sm font-medium text-white/35">/{w.totalBeds}</span>
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          )
        })}
        {occupancy.length === 0 && !loading && (
          <p className="text-sm text-white/35 col-span-full text-center py-6">No ward occupancy data.</p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white">Admissions</h2>
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
                    <th>Ward</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {admissions.map((a) => (
                    <tr key={a.id} className="cursor-pointer" onClick={() => void open(a)}>
                      <td className="font-medium text-white">{a.patientName}</td>
                      <td className="text-white/60">{a.wardName} · {a.bedNumber}</td>
                      <td>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">{a.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5 min-h-[300px]">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BedDouble size={15} className="text-[#FFA500]" /> Admission details
          </h2>
          {active && active.status !== '—' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="text-white/85">
                    Ward <span className="font-medium text-white">{active.wardName}</span> · Bed{' '}
                    <span className="font-medium text-white">{active.bedNumber}</span>
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">Admitted {formatDateTime(active.admittedAtUtc)}</p>
                  {active.dischargedAtUtc && (
                    <p className="text-xs text-white/40 mt-0.5">Discharged {formatDateTime(active.dischargedAtUtc)}</p>
                  )}
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full border border-white/10 bg-white/10 text-white/60">
                  {active.status}
                </span>
              </div>

              {active.status !== 'Discharged' && (
                <button className="btn-ghost w-full text-red-400 border-red-500/25 hover:bg-red-500/10" disabled={busy} onClick={() => void discharge()}>
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  Discharge patient
                </button>
              )}

              <div>
                <p className="text-xs font-semibold text-white/45 uppercase tracking-wider mb-2">Ward notes</p>
                {active.notes.length > 0 && (
                  <ul className="space-y-2 mb-3">
                    {active.notes.map((n, i) => (
                      <li key={i} className="text-sm text-white/75">
                        {n.content}
                        <span className="block text-[11px] text-white/35 mt-0.5">{formatDateTime(n.recordedAtUtc)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <WardNoteComposer onAdd={(content) => void addNote(content)} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <BedDouble size={28} className="text-white/20" />
              <p className="text-sm text-white/40 max-w-xs">Select an admission to view ward notes and discharge.</p>
            </div>
          )}
        </div>
      </div>

      {showAdmit && (
        <AdmitModal
          onClose={() => setShowAdmit(false)}
          onAdmitted={(a) => {
            setShowAdmit(false)
            setActive(a)
          }}
        />
      )}
    </div>
  )
}

function WardNoteComposer({ onAdd }: { onAdd: (content: string) => void }) {
  const [note, setNote] = useState('')
  return (
    <div className="flex gap-2">
      <input className="input" placeholder="Add ward note…" value={note} onChange={(e) => setNote(e.target.value)} />
      <button
        className="btn-primary shrink-0"
        disabled={!note.trim()}
        onClick={() => {
          onAdd(note)
          setNote('')
        }}
      >
        Add
      </button>
    </div>
  )
}

// ─── Admit modal ─────────────────────────────────────────────────────────

function AdmitModal({ onClose, onAdmitted }: { onClose: () => void; onAdmitted: (a: AdmissionDetail) => void }) {
  const user = useAuthStore((s) => s.user)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PatientSummary[]>([])
  const [selected, setSelected] = useState<PatientSummary | null>(null)
  const [wardName, setWardName] = useState('General Ward')
  const [bedNumber, setBedNumber] = useState('')
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

  const admit = async () => {
    if (!selected) {
      toast.error('Select a patient first.')
      return
    }
    if (!wardName.trim() || !bedNumber.trim()) {
      toast.error('Ward and bed number are required.')
      return
    }
    setSaving(true)
    try {
      const res = await inpatientApi.admit({
        patientId: selected.id,
        admittingClinicianUserId: user?.userId ?? '',
        wardName: wardName.trim(),
        bedNumber: bedNumber.trim(),
      })
      toast.success(`Admitted to ${res.wardName} · Bed ${res.bedNumber}`)
      onAdmitted(res)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Admission failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Admit patient</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-sm">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Patient</label>
            <input className="input" placeholder="Search patient…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
            {selected && <p className="text-xs text-emerald-400 mt-2">✓ {selected.fullName}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Ward</label>
              <select className="input" value={wardName} onChange={(e) => setWardName(e.target.value)}>
                {['General Ward', 'Maternity', 'Pediatric', 'Surgical', 'ICU', 'Isolation'].map((w) => <option key={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Bed number</label>
              <input className="input" placeholder="e.g. A-12" value={bedNumber} onChange={(e) => setBedNumber(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={saving} onClick={() => void admit()}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Admit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
