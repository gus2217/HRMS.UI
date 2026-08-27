import { useEffect, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Receipt, CreditCard } from 'lucide-react'
import {
  billingApi,
  patientApi,
  type InvoiceDetail,
  type PatientSummary,
  type PaymentReceiptDto,
} from '@/lib/api'
import { formatDateTime, formatMoney } from '@/lib/format'

interface InvoiceRow extends InvoiceDetail {
  patientName?: string
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showIssue, setShowIssue] = useState(false)
  const [active, setActive] = useState<InvoiceRow | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await patientApi.search(undefined, 1, 20).catch(() => null)
        if (!mounted) return
        setInvoices(
          (res?.items ?? []).slice(0, 10).map((p: PatientSummary) => ({
            id: p.id,
            patientId: p.id,
            consultationId: null,
            status: '—',
            totalAmount: 0,
            primaryPaymentMethod: null,
            lines: [],
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

  const open = async (inv: InvoiceRow) => {
    try {
      const detail = await billingApi.detail(inv.id)
      setActive({ ...inv, ...detail })
    } catch {
      toast.error('No invoice for this patient yet — issue one.')
      setActive(null)
    }
  }

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Billing</h1>
          <p className="text-sm text-white/40 mt-0.5">Invoices, payments & SHA claims</p>
        </div>
        <button className="btn-primary" onClick={() => setShowIssue(true)}>
          <Receipt size={16} />
          Issue invoice
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white">Recent invoices</h2>
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
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="cursor-pointer" onClick={() => void open(inv)}>
                      <td className="font-medium text-white">{inv.patientName}</td>
                      <td>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">{inv.status}</span>
                      </td>
                      <td className="text-right font-semibold text-white/85">{formatMoney(inv.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5 min-h-[300px]">
          <h2 className="text-sm font-semibold text-white mb-4">Invoice details</h2>
          {active && active.status !== '—' ? (
            <InvoiceDetailView invoice={active} onPaid={(r) => {
              toast.success(`Payment of ${formatMoney(r.amountPaid)} recorded`)
              setActive((prev) => (prev ? { ...prev, status: 'Paid' } : prev))
            }} />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <CreditCard size={28} className="text-white/20" />
              <p className="text-sm text-white/40 max-w-xs">Select an invoice to view lines and record payment.</p>
            </div>
          )}
        </div>
      </div>

      {showIssue && <IssueInvoiceModal onClose={() => setShowIssue(false)} />}
    </div>
  )
}

// ─── Invoice detail + payment ────────────────────────────────────────────

function InvoiceDetailView({ invoice, onPaid }: { invoice: InvoiceRow; onPaid: (r: PaymentReceiptDto) => void }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Cash')
  const [reference, setReference] = useState('')
  const [paying, setPaying] = useState(false)
  const [showSha, setShowSha] = useState(false)
  const [shaRef, setShaRef] = useState('')
  const [shaSaving, setShaSaving] = useState(false)

  const pay = async () => {
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount.')
      return
    }
    setPaying(true)
    try {
      const res = await billingApi.recordPayment({
        invoiceId: invoice.id,
        amountPaid: amt,
        method,
        providerTransactionReference: reference.trim(),
      })
      onPaid(res)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  const submitSha = async () => {
    if (!shaRef.trim()) {
      toast.error('Enter the SHA claim reference.')
      return
    }
    setShaSaving(true)
    try {
      const res = await billingApi.submitShaClaim(invoice.id, shaRef.trim())
      toast.success(`SHA claim submitted (${res.status})`)
      setShowSha(false)
      setShaRef('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'SHA claim failed')
    } finally {
      setShaSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">Issued {formatDateTime(invoice.id ? new Date().toISOString() : null)}</p>
        <span className={`text-xs px-2.5 py-1 rounded-full border ${
          invoice.status === 'Paid'
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
            : invoice.status === 'PartiallyPaid'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
              : 'bg-white/10 text-white/60 border-white/10'
        }`}>
          {invoice.status}
        </span>
      </div>

      <div className="space-y-2">
        {invoice.lines.map((l) => (
          <div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm">
            <div>
              <p className="font-medium text-white">{l.description}</p>
              <p className="text-xs text-white/35">{l.serviceCode} · {l.quantity} × {formatMoney(l.unitPrice)}</p>
            </div>
            <p className="font-semibold text-white/85">{formatMoney(l.lineTotal)}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
        <p className="text-sm font-semibold text-white">Total</p>
        <p className="text-lg font-bold text-[#FFA500]">{formatMoney(invoice.totalAmount)}</p>
      </div>

      {invoice.status !== 'Paid' && (
        <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-3">
          <p className="text-xs font-semibold text-white/45 uppercase tracking-wider">Record payment</p>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" min={0} className="input" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              {['Cash', 'Mpesa', 'Card', 'BankTransfer', 'Insurance', 'SHA'].map((m) => <option key={m}>{m}</option>)}
            </select>
            <input className="input" placeholder="Ref / till" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={paying} onClick={() => void pay()}>
              {paying && <Loader2 size={14} className="animate-spin" />}
              Record payment
            </button>
            <button className="btn-ghost" onClick={() => setShowSha((v) => !v)}>SHA claim</button>
          </div>
          {showSha && (
            <div className="flex gap-2">
              <input className="input" placeholder="SHA claim reference" value={shaRef} onChange={(e) => setShaRef(e.target.value)} />
              <button className="btn-ghost shrink-0" disabled={shaSaving} onClick={() => void submitSha()}>
                {shaSaving && <Loader2 size={14} className="animate-spin" />}
                Submit
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Issue invoice modal ─────────────────────────────────────────────────

function IssueInvoiceModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PatientSummary[]>([])
  const [selected, setSelected] = useState<PatientSummary | null>(null)
  const [method, setMethod] = useState('Cash')
  const [lines, setLines] = useState([{ serviceCode: '', description: '', quantity: 1, unitPrice: 0 }])
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
    const valid = lines.filter((l) => l.serviceCode.trim() && l.description.trim() && l.quantity > 0)
    if (valid.length === 0) {
      toast.error('Add at least one invoice line.')
      return
    }
    setSaving(true)
    try {
      await billingApi.issueInvoice({
        patientId: selected.id,
        primaryPaymentMethod: method,
        lines: valid.map((l) => ({
          serviceCode: l.serviceCode.trim(),
          description: l.description.trim(),
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      })
      toast.success('Invoice issued')
      onClose()
      setTimeout(() => window.location.reload(), 400)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to issue invoice')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-[#0b1220] rounded-t-xl">
          <h2 className="text-sm font-semibold text-white">Issue invoice</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-sm">✕</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
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

          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Primary payment method</label>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              {['Cash', 'Mpesa', 'Card', 'BankTransfer', 'Insurance', 'SHA'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Invoice lines</p>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[80px_1fr_60px_90px] gap-2">
                <input className="input" placeholder="Code" value={l.serviceCode} onChange={(e) => setLine(i, { serviceCode: e.target.value })} />
                <input className="input" placeholder="Description (e.g. Consultation)" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                <input type="number" min={1} className="input" value={l.quantity} onChange={(e) => setLine(i, { quantity: Number(e.target.value) })} />
                <input type="number" min={0} className="input" placeholder="Price" value={l.unitPrice || ''} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) })} />
              </div>
            ))}
            <button
              type="button"
              className="text-xs font-medium text-[#FFA500] hover:text-[#ffb32e]"
              onClick={() => setLines((ls) => [...ls, { serviceCode: '', description: '', quantity: 1, unitPrice: 0 }])}
            >
              + Add line
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Issue invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
