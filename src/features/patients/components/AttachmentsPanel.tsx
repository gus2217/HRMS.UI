// ============================================================
// AttachmentsPanel.tsx
// Location: src/features/patients/components/AttachmentsPanel.tsx
//
// Patient document attachments (scans, lab reports, referral letters,
// consent forms) — upload, list, download, delete. Mirrors the OpenMRS
// "Attachments" patient-chart widget.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Paperclip, Upload, Download, Trash2, Loader2 } from 'lucide-react';
import { FlagsAttachmentsOrdersService } from '@/features/consultations/services/flagsAttachmentsOrdersService';
import type { PatientAttachmentDto } from '@/features/consultations/types/flagsAttachmentsOrders';
import { formatDateTime, formatBytes } from '@/lib/format';

export default function AttachmentsPanel({ patientId }: { patientId: string }) {
  const [items, setItems] = useState<PatientAttachmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('General');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setItems(await FlagsAttachmentsOrdersService.attachments(patientId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      await FlagsAttachmentsOrdersService.upload(patientId, file, category);
      toast.success('Attachment uploaded');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await FlagsAttachmentsOrdersService.removeAttachment(id);
      toast.success('Attachment removed');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove attachment');
    }
  };

  const download = (id: string) => {
    // Direct link carries the bearer token via a fetch → blob so auth applies.
    void (async () => {
      try {
        const token = (await import('@/lib/apiClient')).getAccessToken();
        const res = await fetch(FlagsAttachmentsOrdersService.downloadUrl(id), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Download failed');
        const blob = await res.blob();
        const disposition = res.headers.get('Content-Disposition') ?? '';
        const nameMatch = disposition.match(/filename="?([^";]+)"?/);
        const name = nameMatch?.[1] ?? 'attachment';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Download failed');
      }
    })();
  };

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <span className="text-indigo-600"><Paperclip size={15} /></span>
          Attachments
        </h3>
        <div className="flex items-center gap-2">
          <select className="input !w-auto !py-1 !px-2 text-xs" value={category} onChange={(e) => setCategory(e.target.value)}>
            {['General', 'Lab report', 'Referral letter', 'Consent', 'Imaging', 'Other'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-primary !py-1.5 text-xs inline-flex items-center gap-1.5"
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            Upload
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => void onFile(e)} />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">No documents attached.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((a) => (
            <li key={a.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{a.fileName}</p>
                <p className="text-xs text-slate-400">
                  {a.category} · {formatBytes(a.sizeBytes)} · {formatDateTime(a.uploadedAtUtc)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button type="button" onClick={() => download(a.id)} title="Download"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                  <Download size={14} />
                </button>
                <button type="button" onClick={() => void remove(a.id)} title="Delete"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
