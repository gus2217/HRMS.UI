// ============================================================
// PermissionGrid.tsx
// Location: src/features/staff/components/PermissionGrid.tsx
//
// Permission matrix used by the access editor:
//  - checked + locked : granted via a selected role ("via role")
//  - checked + togglable : granted directly to the user
//  - unchecked : not granted
// Effective access = role-derived permissions ∪ direct grants.
// The catalog comes from the backend so codes/descriptions never drift.
// ============================================================

import { useMemo, useState } from 'react';
import { Lock, Search } from 'lucide-react';
import type { PermissionDto, RoleDto } from '../types/staff';

interface Props {
  /** Full permission catalog (GET /identity/permissions). */
  catalog: PermissionDto[];
  /** All known roles with their bundled permissions (GET /identity/roles). */
  roles: RoleDto[];
  selectedRoleNames: string[];
  directCodes: string[];
  onChangeDirect: (codes: string[]) => void;
}

/** Permissions grouped under their module (code prefix before the last dot). */
function groupPermissions(catalog: PermissionDto[]): { module: string; items: PermissionDto[] }[] {
  const groups = new Map<string, PermissionDto[]>();
  for (const p of catalog) {
    const module = p.code.includes('.') ? p.code.slice(0, p.code.lastIndexOf('.')) : 'General';
    const list = groups.get(module) ?? [];
    list.push(p);
    groups.set(module, list);
  }
  return [...groups.entries()]
    .map(([module, items]) => ({ module, items: items.sort((a, b) => a.code.localeCompare(b.code)) }))
    .sort((a, b) => a.module.localeCompare(b.module));
}

export default function PermissionGrid({
  catalog,
  roles,
  selectedRoleNames,
  directCodes,
  onChangeDirect,
}: Props) {
  const [query, setQuery] = useState('');

  const roleCodes = useMemo(() => {
    const set = new Set<string>();
    for (const role of roles) {
      if (selectedRoleNames.includes(role.name)) {
        for (const code of role.permissions) set.add(code);
      }
    }
    return set;
  }, [roles, selectedRoleNames]);

  const directSet = useMemo(() => new Set(directCodes), [directCodes]);

  const toggle = (code: string) => {
    if (roleCodes.has(code)) return; // role-derived: managed via the role, not here
    const next = new Set(directSet);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChangeDirect([...next].sort());
  };

  const filtered = groupPermissions(catalog).filter((group) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      group.module.toLowerCase().includes(q) ||
      group.items.some((p) => p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    );
  });

  const effectiveCount = useMemo(() => {
    const set = new Set([...roleCodes, ...directSet]);
    return set.size;
  }, [roleCodes, directSet]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-8 py-1.5 text-xs"
            placeholder="Filter permissions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{effectiveCount}</span> effective
        </p>
      </div>

      <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
        {filtered.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-8">No permissions match “{query}”.</p>
        )}
        {filtered.map((group) => (
          <div key={group.module} className="p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              {group.module}
            </p>
            <div className="grid gap-1">
              {group.items.map((p) => {
                const viaRole = roleCodes.has(p.code);
                const direct = directSet.has(p.code);
                const checked = viaRole || direct;
                return (
                  <button
                    key={p.code}
                    type="button"
                    disabled={viaRole}
                    onClick={() => toggle(p.code)}
                    title={p.description}
                    className={`w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      viaRole ? 'cursor-default' : 'hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        checked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                      } ${viaRole ? 'opacity-70' : ''}`}
                    >
                      {checked && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                          <path
                            d="M1.5 5.5L3.5 7.5L8.5 2.5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-medium text-slate-700 truncate">
                        {shortLabel(p.code)}
                      </span>
                      <span className="block text-[11px] text-slate-400 truncate font-mono">{p.code}</span>
                    </span>
                    {viaRole && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5 flex-shrink-0">
                        <Lock size={9} /> via role
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Identity.User.View" → "View" — the action part reads best in a picker. */
function shortLabel(code: string): string {
  return code.includes('.') ? code.slice(code.lastIndexOf('.') + 1) : code;
}
