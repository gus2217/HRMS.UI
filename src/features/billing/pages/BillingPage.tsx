import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Receipt, CreditCard } from 'lucide-react';
import { BillingService } from '../services/billingService';
import { PatientService } from '@/features/patients/services/patientService';
import type { InvoiceDetail, PaymentReceiptDto } from '../types/billing';
import type { PatientSummary } from '@/features/patients/types/patient';
import { formatMoney } from '@/lib/format';

interface InvoiceRow extends InvoiceDetail {
  patientName?: string;
}

const PAYMENT_METHODS = ['Cash', 'Mpesa', 'Card', 'BankTransfer', 'Insurance', 'SHA'];

export default function BillingPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssue, setShowIssue] = useState(false);
  const [active, setActive] = useState<InvoiceRow | null>(null);

  // Issue-invoice modal state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientSummary[]>([]);
  const [selected, setSelected] = useState<PatientSummary | null>(null);
  const [method, setMethod] = useState('Cash');
  const [lines, setLines] = useState([{ serviceCode: '', description: '', quantity: 1, unitPrice: 0 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await PatientService.search(undefined, 1, 20).catch(() => null);
        if (!mounted) return;
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      PatientService.search(query.trim(), 1, 6)
        .then((res) => setResults(res.items))
        .catch(() => setResults([]));
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const open = async (inv: InvoiceRow) => {
    try {
      const detail = await BillingService.detail(inv.id);
      setActive({ ...inv, ...detail });
    } catch {
      toast.error('No invoice for this patient yet — issue one.');
      setActive(null);
    }
  };

  const setLine = (index: number, patch: Partial<(typeof lines)[number]>) =>
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const issueInvoice = async () => {
    if (!selected) {
      toast.error('Select a patient first.');
      return;
    }
    const valid = lines.filter((l) => l.serviceCode.trim() && l.description.trim() && l.quantity > 0);
    if (valid.length === 0) {
      toast.error('Add at least one invoice line.');
      return;
    }
    setSaving(true);
    try {
      const res = await BillingService.issueInvoice({
        patientId: selected.id,
        primaryPaymentMethod: method,
        lines: valid.map((l) => ({
          serviceCode: l.serviceCode.trim(),
          description: l.description.trim(),
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      });
      toast.success('Invoice issued');
      setShowIssue(false);
      setActive({ ...res, patientName: selected.fullName });
      setQuery('');
      setSelected(null);
      setLines([{ serviceCode: '', description: '', quantity: 1, unitPrice: 0 }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to issue invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Billing</h1>
          <p className="text-sm text-slate-500 mt-0.5">Invoices, payments & SHA claims</p>
        </div>
        <button className="btn-primary" onClick={() => setShowIssue(true)}>
          <Receipt size={16} />
          Issue invoice
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Recent invoices</h2>
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
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="cursor-pointer" onClick={() => void open(inv)}>
                      <td className="font-medium text-slate-900">{inv.patientName}</td>
                      <td>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{inv.status}</span>
                      </td>
                      <td className="text-right font-semibold text-slate-700">{formatMoney(inv.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5 min-h-[300px]">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Invoice details</h2>
          {active && active.status !== '—' ? (
            <InvoiceDetailView
              invoice={active}
              onPaid={(r) => {
                toast.success(`Payment of ${formatMoney(r.amountPaid)} recorded`);
                setActive((prev) => (prev ? { ...prev, status: 'Paid' } : prev));
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <CreditCard size={28} className="text-slate-300" />
              <p className="text-sm text-slate-400 max-w-xs">Select an invoice to view lines and record payment.</p>
            </div>
          )}
        </div>
      </div>

      {showIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowIssue(false)}>
          <div className="card w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
              <h2 className="text-sm font-semibold text-slate-900">Issue invoice</h2>
              <button onClick={() => setShowIssue(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Patient</label>
                <input className="input" placeholder="Search patient…" value={query} onChange={(e) => setQuery(e.target.value)} />
                {results.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {results.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(p);
                            setQuery('');
                            setResults([]);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          {p.fullName} <span className="ml-2 font-mono text-xs text-indigo-600">{p.patientNumber}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {selected && <p className="text-xs text-emerald-600 mt-2">✓ {selected.fullName}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Primary payment method</label>
                <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice lines</p>
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
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  onClick={() => setLines((ls) => [...ls, { serviceCode: '', description: '', quantity: 1, unitPrice: 0 }])}
                >
                  + Add line
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button className="btn-ghost" onClick={() => setShowIssue(false)}>Cancel</button>
                <button className="btn-primary" disabled={saving} onClick={() => void issueInvoice()}>
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  Issue invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InvoiceDetailView({ invoice, onPaid }: { invoice: InvoiceRow; onPaid: (r: PaymentReceiptDto) => void }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [paying, setPaying] = useState(false);
  const [showSha, setShowSha] = useState(false);
  const [shaRef, setShaRef] = useState('');
  const [shaSaving, setShaSaving] = useState(false);

  const pay = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    setPaying(true);
    try {
      const res = await BillingService.recordPayment({
        invoiceId: invoice.id,
        amountPaid: amt,
        method,
        providerTransactionReference: reference.trim(),
      });
      onPaid(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const submitSha = async () => {
    if (!shaRef.trim()) {
      toast.error('Enter the SHA claim reference.');
      return;
    }
    setShaSaving(true);
    try {
      const res = await BillingService.submitShaClaim(invoice.id, shaRef.trim());
      toast.success(`SHA claim submitted (${res.status})`);
      setShowSha(false);
      setShaRef('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'SHA claim failed');
    } finally {
      setShaSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2.5 py-1 rounded-full border ${
          invoice.status === 'Paid'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : invoice.status === 'PartiallyPaid'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          {invoice.status}
        </span>
      </div>

      <div className="space-y-2">
        {invoice.lines.map((l) => (
          <div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
            <div>
              <p className="font-medium text-slate-900">{l.description}</p>
              <p className="text-xs text-slate-400">{l.serviceCode} · {l.quantity} × {formatMoney(l.unitPrice)}</p>
            </div>
            <p className="font-semibold text-slate-700">{formatMoney(l.lineTotal)}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
        <p className="text-sm font-semibold text-slate-900">Total</p>
        <p className="text-lg font-bold text-indigo-600">{formatMoney(invoice.totalAmount)}</p>
      </div>

      {invoice.status !== 'Paid' && (
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Record payment</p>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" min={0} className="input" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
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
  );
}
