// ============================================================
// Runtime configuration.
// API base is resolved from a window-level env object (injected by
// the host at deploy time) with a same-origin `/api/v1` fallback —
// Vite proxies /api to the backend in dev.
// ============================================================

export const API_BASE = '/api/v1'
