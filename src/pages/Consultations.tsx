import { useEffect, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Plus, Stethoscope, Activity, ClipboardList, CheckCircle2 } from 'lucide-react'
import {
  consultationApi,
  patientApi,
  type ConsultationDetail,
  type PatientSummary,
} from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { useAuthStore } from '@/store/authStore'

interface ConsultationWithPatient extends ConsultationDetail {
  patientName?: string
  patientNumber?: string
}

export default function ConsultationsPage() {
  const user = useAuthStore((s) => s.user)
  const [consultations, setConsultations] = useState<ConsultationWithPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [showStart, setShowStart] = useState(false)
  const [active, setActive] = useState<ConsultationWithPatient | null>(null)
  const [activeLoading, setActiveLoading] = useState(false)

  // Recent consultations: pull the patient list and start with an empty set.
  // The API has no "list consultations" endpoint, so the workflow is:
  // register/find a patient → start a consultation → work it in the detail panel.
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await patientApi.search(undefined, 1, 50)
        if (!mounted) return
        // Seed from recently registered patients (recently active).
        const seeded: ConsultationWithPatient[] = res.items.slice(0, 10).map((p) => ({
          id: p.id,
          patientId: p.id,
          clinicianUserId: user?.userId ?? '',
          status: '—',
          startedAtUtc: p.lastVisitDate ?? p.dateOfBirth,
          completedAtUtc: null,
          patientName: p.fullName,
          patientNumber: p.patientNumber,
          triage: null,
          diagnoses: [],
          notes: [],
        }))
        setConsultations(seeded)
      } catch {
        /* keep empty */
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [user?.userId])

  const openConsultation = async (c: ConsultationWithPatient) => {
    setActiveLoading(true)
    setActive(c)
    try {
      // Only real consultations have a UUID we can fetch.
      const detail = await consultationApi.detail(c.id)
      setActive({ ...c, ...detail })
    } catch {
      toast.error('This patient has no active consultation yet — start one.')
      setActive(null)
    } finally {
      setActiveLoading(false)
    }
  }

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Consultations</h1>
          <p className="text-sm text-white/40 mt-0.5">Start and work patient consultations</p>
        </div>
        <button className="btn-primary" onClick={() => setShowStart(true)}>
          <Plus size={16} />
          Start consultation
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Patient queue */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
            <Stethoscope size={15} className="text-[#FFA500]" />
            <h2 className="text-sm font-semibold text-white">Recent patients</h2>
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
                    <th>No.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {consultations.map((c) => (
                    <tr key={c.id} className="cursor-pointer" onClick={() => openConsultation(c)}>
                      <td className="font-medium text-white">{c.patientName}</td>
                      <td className="font-mono text-xs text-[#FFA500]">{c.patientNumber}</td>
                      <td className="text-right">
                        <button
                          className="text-xs font-medium text-[#FFA500] hover:text-[#ffb32e]"
                          onClick={(e) => {
                            e.stopPropagation()
                            void openConsultation(c)
                          }}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="card p-5 min-h-[300px]">
          {activeLoading ? (
            <div className="flex items-center justify-center gap-3 py-16">
              <Loader2 size={20} className="animate-spin text-[#FFA500]" />
              <p className="text-sm text-white/40">Loading consultation…</p>
            </div>
          ) : active ? (
            <ConsultationDetailView
              consultation={active}
              onChanged={(updated) => setActive((prev) => (prev ? { ...prev, ...updated } : prev))}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Activity size={28} className="text-white/20" />
              <p className="text-sm text-white/40 max-w-xs">
                Select a patient to view or work their consultation.
              </p>
            </div>
          )}
        </div>
      </div>

      {showStart && (
        <StartConsultationModal
          onClose={() => setShowStart(false)}
          onStarted={(c) => {
            setShowStart(false)
            setActive({ ...c, patientName: c.patientId, patientNumber: '' })
          }}
        />
      )}
    </div>
  )
}

// ─── Consultation detail (triage / diagnosis / notes / complete) ──────────

function ConsultationDetailView({
  consultation,
  onChanged,
}: {
  consultation: ConsultationWithPatient
  onChanged: (c: ConsultationDetail) => void
}) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [showDiagnosis, setShowDiagnosis] = useState(false)

  const isReal = consultation.status !== '—'

  const run = async (fn: () => Promise<ConsultationDetail>) => {
    setBusy(true)
    try {
      const updated = await fn()
      onChanged(updated)
      toast.success('Saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  if (!isReal) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-white/50 mb-4">No active consultation for this patient yet.</p>
        <button
          className="btn-primary"
          disabled={busy}
          onClick={() =>
            void run(() =>
              consultationApi.start(consultation.patientId, useAuthStore.getState().user?.userId ?? ''),
            )
          }
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          Start consultation
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Consultation</p>
          <p className="text-xs text-white/40 mt-0.5">{formatDateTime(consultation.startedAtUtc)}</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-[#FFA500]/10 text-[#FFA500] border border-[#FFA500]/20">
          {consultation.status}
        </span>
      </div>

      {/* Triage */}
      <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <p className="text-xs font-semibold text-white/45 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Activity size={12} /> Triage vitals
        </p>
        {consultation.triage ? (
          <div className="grid grid-cols-5 gap-2 text-center text-sm">
            <Vital label="Temp" value={consultation.triage.temperatureCelsius ? `${consultation.triage.temperatureCelsius}°C` : '—'} />
            <Vital label="BP" value={consultation.triage.bloodPressure ?? '—'} />
            <Vital label="Pulse" value={consultation.triage.pulseRate?.toString() ?? '—'} />
            <Vital label="Resp" value={consultation.triage.respiratoryRate?.toString() ?? '—'} />
            <Vital label="Weight" value={consultation.triage.weightKg ? `${consultation.triage.weightKg}kg` : '—'} />
          </div>
        ) : (
          <p className="text-sm text-white/35">Not recorded.</p>
        )}
      </div>

      {/* Diagnoses */}
      <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-white/45 uppercase tracking-wider flex items-center gap-1.5">
            <ClipboardList size={12} /> Diagnoses
          </p>
          <button className="text-xs font-medium text-[#FFA500]" onClick={() => setShowDiagnosis((v) => !v)}>
            + Add
          </button>
        </div>
        {consultation.diagnoses.length === 0 && !showDiagnosis ? (
          <p className="text-sm text-white/35">None recorded.</p>
        ) : (
          <div className="space-y-2">
            {consultation.diagnoses.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-[#FFA500]/10 text-[#FFA500]">{d.icdCode}</span>
                <span className="text-white/75">{d.description}</span>
              </div>
            ))}
            {showDiagnosis && (
              <DiagnosisForm
                onCancel={() => setShowDiagnosis(false)}
                onSave={(input) =>
                  void run(() => {
                    setShowDiagnosis(false)
                    return consultationApi.recordDiagnosis(consultation.id, input)
                  })
                }
              />
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <p className="text-xs font-semibold text-white/45 uppercase tracking-wider mb-2">Clinical notes</p>
        {consultation.notes.length > 0 && (
          <ul className="space-y-2 mb-3">
            {consultation.notes.map((n, i) => (
              <li key={i} className="text-sm text-white/75">
                {n.content}
                <span className="block text-[11px] text-white/35 mt-0.5">{formatDateTime(n.recordedAtUtc)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Add a clinical note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            className="btn-primary shrink-0"
            disabled={busy || !note.trim()}
            onClick={() => {
              const content = note.trim()
              setNote('')
              void run(() => consultationApi.addNote(consultation.id, content))
            }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Complete */}
      {consultation.status !== 'Completed' && (
        <button
          className="btn-ghost w-full text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/10"
          disabled={busy}
          onClick={() => void run(() => consultationApi.complete(consultation.id))}
        >
          <CheckCircle2 size={15} />
          Complete consultation
        </button>
      )}
    </div>
  )
}

function Vital({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-white/40">{label}</p>
      <p className="font-medium text-white/85">{value}</p>
    </div>
  )
}

function DiagnosisForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void
  onSave: (input: { icdCode: string; description: string; isPrimary: boolean }) => void
}) {
  const [icdCode, setIcdCode] = useState('')
  const [description, setDescription] = useState('')
  const [isPrimary, setIsPrimary] = useState(true)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!icdCode.trim() || !description.trim()) {
      toast.error('ICD code and description are required.')
      return
    }
    onSave({ icdCode: icdCode.trim(), description: description.trim(), isPrimary })
  }

  return (
    <form onSubmit={submit} className="space-y-2 pt-2">
      <div className="flex gap-2">
        <input className="input w-28" placeholder="ICD-10" value={icdCode} onChange={(e) => setIcdCode(e.target.value)} />
        <input className="input" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-white/60">
          <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
          Primary diagnosis
        </label>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost text-xs py-1.5" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary text-xs py-1.5">Save</button>
        </div>
      </div>
    </form>
  )
}

// ─── Start consultation modal ────────────────────────────────────────────

function StartConsultationModal({
  onClose,
  onStarted,
}: {
  onClose: () => void
  onStarted: (c: ConsultationDetail) => void
}) {
  const user = useAuthStore((s) => s.user)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PatientSummary[]>([])
  const [selected, setSelected] = useState<PatientSummary | null>(null)
  const [searching, setSearching] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!query.trim()) {
        setResults([])
        return
      }
      setSearching(true)
      patientApi
        .search(query.trim(), 1, 8)
        .then((res) => setResults(res.items))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  const start = async () => {
    if (!selected) return
    setStarting(true)
    try {
      const c = await consultationApi.start(selected.id, user?.userId ?? '')
      toast.success(`Consultation started for ${selected.fullName}`)
      onStarted(c)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start consultation')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Start consultation</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-sm">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Find patient</label>
            <input
              className="input"
              placeholder="Search by name or number…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {searching && <p className="text-xs text-white/35 mt-2">Searching…</p>}
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
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                        selected?.id === p.id
                          ? 'bg-[#FFA500]/10 border-[#FFA500]/25 text-white'
                          : 'bg-white/[0.03] border-white/[0.06] text-white/70 hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="font-medium">{p.fullName}</span>
                      <span className="ml-2 font-mono text-xs text-[#FFA500]">{p.patientNumber}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selected && (
            <div className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm">
              <p className="font-medium text-white">{selected.fullName}</p>
              <p className="text-xs text-white/40 mt-0.5">Clinician: {user?.fullName}</p>
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
  )
}
