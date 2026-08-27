import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, ScrollText } from 'lucide-react'
import { auditApi, type AuditLogEntryDto } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

export default function AuditPage() {
  const [items, setItems] = useState<AuditLogEntryDto[]>([])
  const [total, setTotal] = useState(0)
  const [entityType, setEntityType] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = async (type: string, pageNumber: number) => {
    setLoading(true)
    try {
      const res = await auditApi.search(type || undefined, pageNumber, 50)
      setItems(res.items)
      setTotal(res.totalCount)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(entityType, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <ScrollText size={20} className="text-[#FFA500]" /> Audit log
        </h1>
        <p className="text-sm text-white/40 mt-0.5">{total.toLocaleString()} entries</p>
      </div>

      <div className="relative max-w-xs">
        <input
          className="input"
          placeholder="Filter by entity type…"
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value)
            setPage(1)
            void load(e.target.value, 1)
          }}
        />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16">
            <Loader2 size={20} className="animate-spin text-[#FFA500]" />
            <p className="text-sm text-white/40">Loading audit log…</p>
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-white/35 text-center py-16">No audit entries.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Entity ID</th>
                  <th>Performed by</th>
                  <th>When</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <AuditRow key={a.id} entry={a} expanded={expanded === a.id} onToggle={() => setExpanded(expanded === a.id ? null : a.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > 50 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-white/40">
            Page {page} of {Math.max(1, Math.ceil(total / 50))}
          </p>
          <div className="flex gap-2">
            <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button className="btn-ghost" disabled={page >= Math.ceil(total / 50)} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  )
}

function AuditRow({ entry, expanded, onToggle }: { entry: AuditLogEntryDto; expanded: boolean; onToggle: () => void }) {
  const hasDiff = entry.beforeValuesJson || entry.afterValuesJson
  return (
    <>
      <tr className="cursor-pointer" onClick={onToggle}>
        <td>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            entry.action === 'Create'
              ? 'bg-emerald-500/15 text-emerald-400'
              : entry.action === 'Update'
                ? 'bg-sky-500/15 text-sky-400'
                : entry.action === 'Delete'
                  ? 'bg-red-500/15 text-red-400'
                  : 'bg-white/10 text-white/60'
          }`}>
            {entry.action}
          </span>
        </td>
        <td className="text-white/70">{entry.entityType}</td>
        <td className="font-mono text-xs text-white/45">{entry.entityId.slice(0, 8)}…</td>
        <td className="text-white/60">{entry.performedByUserId.slice(0, 8)}…</td>
        <td className="text-white/50">{formatDateTime(entry.performedAtUtc)}</td>
        <td className="text-right text-white/30">{hasDiff ? '▾' : ''}</td>
      </tr>
      {expanded && hasDiff && (
        <tr>
          <td colSpan={6} className="bg-black/20">
            <div className="grid sm:grid-cols-2 gap-3 p-4 text-xs">
              {entry.beforeValuesJson && (
                <div>
                  <p className="text-white/40 font-semibold uppercase tracking-wider mb-1">Before</p>
                  <pre className="whitespace-pre-wrap text-white/70 font-mono">{pretty(entry.beforeValuesJson)}</pre>
                </div>
              )}
              {entry.afterValuesJson && (
                <div>
                  <p className="text-white/40 font-semibold uppercase tracking-wider mb-1">After</p>
                  <pre className="whitespace-pre-wrap text-white/70 font-mono">{pretty(entry.afterValuesJson)}</pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function pretty(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2)
  } catch {
    return json
  }
}
