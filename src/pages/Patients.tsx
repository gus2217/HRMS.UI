import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, UserPlus, Loader2, Users } from 'lucide-react'
import { patientApi, type PatientSummary, type RegisterPatientResponse, type DuplicateCandidate } from '@/lib/api'
import { formatDate, ageFromDateOfBirth } from '@/lib/format'

export default function PatientsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<PatientSummary[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showRegister, setShowRegister] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = async (term: string, pageNumber: number) => {
    setLoading(true)
    try {
      const res = await patientApi.search(term || undefined, pageNumber, 25)
      setItems(res.items)
      setTotal(res.totalCount)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(search, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleSearch = (value: string) => {
    setSearch(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      void load(value, 1)
    }, 350)
  }

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Patients</h1>
          <p className="text-sm text-white/40 mt-0.5">{formatNumber(total)} records</p>
        </div>
        <button className="btn-primary" onClick={() => setShowRegister(true)}>
          <UserPlus size={16} />
          Register patient
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          className="input pl-10"
          placeholder="Search by name, number or phone…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16">
            <Loader2 size={20} className="animate-spin text-[#FFA500]" />
            <p className="text-sm text-white/40">Loading patients…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users size={28} className="text-white/20" />
            <p className="text-sm text-white/40">No patients found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Patient no.</th>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Date of birth</th>
                  <th>Phone</th>
                  <th>Last visit</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="cursor-pointer" onClick={() => navigate(`/patients/${p.id}`)}>
                    <td className="font-mono text-xs text-[#FFA500]">{p.patientNumber}</td>
                    <td className="font-medium text-white">{p.fullName}</td>
                    <td>{ageFromDateOfBirth(p.dateOfBirth) ?? '—'}</td>
                    <td>{formatDate(p.dateOfBirth)}</td>
                    <td>{p.phone ?? '—'}</td>
                    <td>{formatDate(p.lastVisitDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 25 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-white/40">
            Page {page} of {Math.max(1, Math.ceil(total / 25))}
          </p>
          <div className="flex gap-2">
            <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <button
              className="btn-ghost"
              disabled={page >= Math.ceil(total / 25)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showRegister && <RegisterPatientModal onClose={() => setShowRegister(false)} onCreated={(p) => navigate(`/patients/${p.id}`)} />}
    </div>
  )
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-KE').format(n)
}

// ─── Register modal ──────────────────────────────────────────────────────

function RegisterPatientModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: { id: string }) => void }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'Female',
    maritalStatus: 'Single',
    phone: '',
    nationalId: '',
    shaNumber: '',
    county: 'Nairobi',
    subCounty: '',
    ward: '',
    line1: '',
    nextOfKinName: '',
    nextOfKinRelationship: '',
    nextOfKinPhone: '',
  })
  const [saving, setSaving] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([])

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim() || !form.dateOfBirth || !form.phone.trim()) {
      toast.error('First name, last name, date of birth and phone are required.')
      return
    }
    setSaving(true)
    try {
      const res: RegisterPatientResponse = await patientApi.register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: new Date(form.dateOfBirth).toISOString(),
        gender: form.gender,
        maritalStatus: form.maritalStatus,
        phone: form.phone.trim(),
        nationalId: form.nationalId.trim() || null,
        shaNumber: form.shaNumber.trim() || null,
        county: form.county.trim(),
        subCounty: form.subCounty.trim() || null,
        ward: form.ward.trim() || null,
        line1: form.line1.trim() || null,
        nextOfKin:
          form.nextOfKinName.trim() && form.nextOfKinRelationship.trim()
            ? [
                {
                  fullName: form.nextOfKinName.trim(),
                  relationship: form.nextOfKinRelationship.trim(),
                  phone: form.nextOfKinPhone.trim() || null,
                },
              ]
            : undefined,
      })
      setDuplicates(res.duplicateCandidates ?? [])
      if (res.duplicateCandidates && res.duplicateCandidates.length > 0) {
        toast.error('Possible duplicates found — review before continuing.')
        return
      }
      toast.success(`Registered ${res.patientNumber}`)
      onCreated(res)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-[#0b1220] rounded-t-xl">
          <h2 className="text-sm font-semibold text-white">Register patient</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-sm">✕</button>
        </div>

        {duplicates.length > 0 && (
          <div className="mx-5 mt-4 p-4 rounded-lg border border-[#FFA500]/25 bg-[#FFA500]/[0.06]">
            <p className="text-sm font-semibold text-[#FFA500] mb-2">Possible duplicate records:</p>
            <ul className="space-y-1 text-xs text-white/70">
              {duplicates.map((d) => (
                <li key={d.id}>
                  {d.fullName} · {d.patientNumber} · {formatDate(d.dateOfBirth)}
                </li>
              ))}
            </ul>
            <p className="text-xs text-white/40 mt-2">
              The record was created, but verify against the candidates above.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="First name *"><input className="input" value={form.firstName} onChange={set('firstName')} /></Field>
            <Field label="Last name *"><input className="input" value={form.lastName} onChange={set('lastName')} /></Field>
            <Field label="Date of birth *">
              <input type="date" className="input" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
            </Field>
            <Field label="Gender">
              <select className="input" value={form.gender} onChange={set('gender')}>
                {['Female', 'Male', 'Other'].map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Marital status">
              <select className="input" value={form.maritalStatus} onChange={set('maritalStatus')}>
                {['Single', 'Married', 'Divorced', 'Widowed'].map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Phone *"><input className="input" placeholder="+2547…" value={form.phone} onChange={set('phone')} /></Field>
            <Field label="National ID"><input className="input" value={form.nationalId} onChange={set('nationalId')} /></Field>
            <Field label="SHA number"><input className="input" value={form.shaNumber} onChange={set('shaNumber')} /></Field>
            <Field label="County">
              <input className="input" value={form.county} onChange={set('county')} />
            </Field>
            <Field label="Sub-county"><input className="input" value={form.subCounty} onChange={set('subCounty')} /></Field>
            <Field label="Ward / location"><input className="input" value={form.ward} onChange={set('ward')} /></Field>
            <Field label="Street / line 1"><input className="input" value={form.line1} onChange={set('line1')} /></Field>
          </div>

          <div className="pt-3 border-t border-white/[0.06]">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Next of kin (optional)</p>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Full name"><input className="input" value={form.nextOfKinName} onChange={set('nextOfKinName')} /></Field>
              <Field label="Relationship"><input className="input" value={form.nextOfKinRelationship} onChange={set('nextOfKinRelationship')} /></Field>
              <Field label="Phone"><input className="input" value={form.nextOfKinPhone} onChange={set('nextOfKinPhone')} /></Field>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-white/50 mb-1.5">{label}</span>
      {children}
    </label>
  )
}
