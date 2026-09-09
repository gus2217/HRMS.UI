// ============================================================
// useWorkloadBadges.ts
// Location: src/features/layout/useWorkloadBadges.ts
//
// Sidebar badge counts: how many items are waiting on the current
// user in each module (approvals, queue, lab worklist, pharmacy,
// billing). Each count reuses the same list endpoint the feature
// page uses (pageSize=1 → cheap) with the status filter that means
// "pending/needs attention". Endpoints are permission-guarded, so a
// failed call simply yields no badge for that module.
//
// Cadence: refresh on mount, whenever the visible route set changes,
// on a 60s interval — and immediately when the tab becomes visible
// again. When every request fails (API down), the poller backs off
// exponentially (up to 5 min) so a dead backend is not hammered.
//
// NOTE on the dependency discipline: `paths` is a fresh array on
// every render of the caller. The effect therefore keys off a stable
// SORTED-JOINED STRING (pathKey), never off the array identity —
// otherwise refresh() re-runs on every render → infinite fetch loop.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { QueueService } from '@/features/queue/services/queueService';
import { AppointmentService } from '@/features/appointments/services/appointmentService';
import { ConsultationService } from '@/features/consultations/services/consultationService';
import { LaboratoryService } from '@/features/laboratory/services/laboratoryService';
import { PharmacyService } from '@/features/pharmacy/services/pharmacyService';
import { BillingService } from '@/features/billing/services/billingService';

/** Route → statuses whose existence is "pending work" for that screen. */
const BADGE_FILTERS: Record<string, string[]> = {
  '/queue': ['Waiting'],
  '/appointments': ['Pending'], // appointment requests awaiting approval
  '/consultations': ['AwaitingClinician'], // patients waiting for a clinician
  '/lab': ['Pending', 'InProgress', 'PartiallyCompleted'],
  '/pharmacy': ['Pending', 'PartiallyDispensed'],
  '/billing': ['Issued', 'PartiallyPaid'],
};

const fetchCount = async (path: string, status: string): Promise<number | null> => {
  try {
    switch (path) {
      case '/queue': {
        const r = await QueueService.list(undefined, status, 1, 1);
        return r.totalCount;
      }
      case '/appointments': {
        // Badge only needs the total — never pull the full request list.
        const r = await AppointmentService.listRequests(status, undefined, 1);
        return r.totalCount;
      }
      case '/consultations': {
        // The consultations section now hosts the clinician queue too, so the
        // badge reflects both: consultations awaiting a clinician + patients
        // waiting in the reception queue (best-effort).
        const r = await ConsultationService.list(1, 1, status);
        let waiting = 0;
        try {
          const q = await QueueService.list(undefined, 'Waiting', 1, 1);
          waiting = q.totalCount;
        } catch {
          // Queue endpoint not available to this user — ignore.
        }
        return r.totalCount + waiting;
      }
      case '/lab': {
        const r = await LaboratoryService.list(1, 1, status);
        return r.totalCount;
      }
      case '/pharmacy': {
        const r = await PharmacyService.list(1, 1, status);
        return r.totalCount;
      }
      case '/billing': {
        const r = await BillingService.list(1, 1, status);
        return r.totalCount;
      }
      default:
        return null;
    }
  } catch {
    return null; // no permission / offline → hide badge
  }
};

const BASE_INTERVAL_MS = 60_000;
const MAX_INTERVAL_MS = 5 * 60_000;

export function useWorkloadBadges(paths: string[]): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});
  // Stable key: sorted+joined paths. The caller passes a fresh array each
  // render; keying on the string (not the array) keeps refresh() stable.
  const pathKey = paths.filter((p) => BADGE_FILTERS[p]).slice().sort().join('|');

  const inFlightRef = useRef(false);
  const failStreakRef = useRef(0);

  const refresh = useCallback(async () => {
    const targets = pathKey ? pathKey.split('|') : [];
    if (targets.length === 0 || inFlightRef.current) return;

    inFlightRef.current = true;
    let anySucceeded = false;
    try {
      const next: Record<string, number> = {};
      await Promise.all(
        targets.map(async (path) => {
          const statuses = BADGE_FILTERS[path];
          // All statuses for a path in parallel; a null result for one status
          // means the endpoint is unavailable → drop the badge for that path.
          const results = await Promise.all(statuses.map((s) => fetchCount(path, s)));
          if (results.some((n) => n === null)) return;
          next[path] = results.reduce<number>((acc, n) => acc + (n ?? 0), 0);
          anySucceeded = true;
        }),
      );
      setCounts(next);
    } finally {
      inFlightRef.current = false;
    }

    // Backoff bookkeeping: reset on success, grow the streak on total failure
    // (API down / auth lost) so we stop hammering an unreachable backend.
    failStreakRef.current = anySucceeded ? 0 : failStreakRef.current + 1;
  }, [pathKey]);

  useEffect(() => {
    let disposed = false;
    let timeout: number | undefined;

    const tick = async () => {
      if (disposed) return;
      if (document.visibilityState !== 'hidden' && !inFlightRef.current) {
        await refresh();
      }
      // Reschedule after each tick; the delay follows the current failure
      // streak so an unreachable API is probed less and less often.
      schedule();
    };

    const schedule = () => {
      const delayMs = Math.min(BASE_INTERVAL_MS * 2 ** failStreakRef.current, MAX_INTERVAL_MS);
      timeout = window.setTimeout(() => void tick(), delayMs);
    };

    if (document.visibilityState !== 'hidden') void refresh();
    schedule();

    // Refresh immediately when the tab regains focus (counts may have changed).
    const onVisible = () => {
      if (disposed) return;
      if (document.visibilityState === 'visible' && !inFlightRef.current) void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      disposed = true;
      if (timeout !== undefined) clearTimeout(timeout);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return counts;
}
