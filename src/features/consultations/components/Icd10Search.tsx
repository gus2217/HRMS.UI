// ============================================================
// Icd10Search.tsx
// Location: src/features/consultations/components/Icd10Search.tsx
//
// Typeahead search over the international WHO ICD-10 dataset
// (3-char categories + 4-char codes). The dataset is lazy-loaded
// (code-split) so the main bundle stays lean. Designed for busy
// clinicians: type a disease or code, arrow-key/click to pick.
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface Icd10Entry {
  code: string;
  name: string;
}

let datasetPromise: Promise<Icd10Entry[]> | null = null;

/** Lazy-loads the ICD-10 dataset once; subsequent calls reuse the promise. */
function loadDataset(): Promise<Icd10Entry[]> {
  if (!datasetPromise) {
    datasetPromise = import('../data/icd10.json').then((m) => m.default as Icd10Entry[]);
  }
  return datasetPromise;
}

const MAX_RESULTS = 12;

export default function Icd10Search({
  onSelect,
  autoFocus = false,
}: {
  onSelect: (entry: Icd10Entry) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<Icd10Entry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Kick off the dataset load on first mount (background warm).
  useEffect(() => {
    setLoading(true);
    loadDataset()
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    if (!entries) return [];
    const q = query.trim().toLowerCase();
    if (!q) return entries.slice(0, MAX_RESULTS);
    const codeHits: Icd10Entry[] = [];
    const nameHits: Icd10Entry[] = [];
    for (const e of entries) {
      const code = e.code.toLowerCase();
      const name = e.name.toLowerCase();
      if (code.startsWith(q)) codeHits.push(e);
      else if (code.includes(q) || name.includes(q)) nameHits.push(e);
      if (codeHits.length + nameHits.length >= MAX_RESULTS * 2) break;
    }
    return [...codeHits, ...nameHits].slice(0, MAX_RESULTS);
  }, [entries, query]);

  // Reset highlight when results change.
  useEffect(() => setHighlight(0), [results]);

  // Close on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (entry: Icd10Entry) => {
    onSelect(entry);
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) {
      if (e.key === 'ArrowDown' && results.length > 0) setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const entry = results[highlight];
      if (entry) pick(entry);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        {loading ? (
          <Loader2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
        ) : (
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        )}
        <input
          ref={inputRef}
          className="input pl-9"
          placeholder="Search ICD-10 — disease or code, e.g. 'diabetes' or 'E11'"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1.5 w-full max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1">
          {results.map((e, i) => (
            <li key={e.code}>
              <button
                type="button"
                className={`w-full flex items-start gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                  i === highlight ? 'bg-indigo-50' : 'hover:bg-slate-50'
                }`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(e)}
              >
                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 shrink-0 mt-0.5">
                  {e.code}
                </span>
                <span className="text-slate-700 leading-snug">{e.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query.trim() && results.length === 0 && !loading && (
        <div className="absolute z-20 mt-1.5 w-full rounded-lg border border-slate-200 bg-white shadow-lg px-3 py-2.5 text-xs text-slate-400">
          No ICD-10 match — you can still save with a manual code/description.
        </div>
      )}
    </div>
  );
}
