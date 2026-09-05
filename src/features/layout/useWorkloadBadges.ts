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
// Badges refresh on mount, whenever the route changes (so actions on
// a page are reflected immediately) and on a 60s interval fallback.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
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
        const r = await AppointmentService.listRequests(status);
        return r.totalCount;
      }
      case '/consultations': {
        const r = await ConsultationService.list(1, 1, status);
        return r.totalCount;
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

export function useWorkloadBadges(paths: string[]): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    const targets = paths.filter((p) => BADGE_FILTERS[p]);
    if (targets.length === 0) return;

    const next: Record<string, number> = {};
    await Promise.all(
      targets.map(async (path) => {
        const statuses = BADGE_FILTERS[path];
        let total = 0;
        for (const status of statuses) {
          const n = await fetchCount(path, status);
          if (n === null) return; // endpoint not available → no badge
          total += n;
        }
        next[path] = total;
      }),
    );
    setCounts(next);
  }, [paths]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 60_000);
    return () => clearInterval(timer);
  }, [refresh]);

  return counts;
}
