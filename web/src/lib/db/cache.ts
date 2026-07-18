import { unstable_cache } from "next/cache";
import {
  getCandidatesForUser,
  getCandidatesGridForUser,
  getStageBookings,
  getUserStats,
  getBookableCandidates,
} from "./queries";
import { getNavPendingCounts } from "@/lib/recruiter/tasks";
import type { MemberRole } from "@/lib/auth/config";

/**
 * Cached version of getCandidatesForUser that revalidates every 60 seconds.
 * This prevents expensive DB queries on every page navigation.
 * 
 * Tagged with "candidates" so cache can be invalidated when candidates are modified.
 */
export const getCachedCandidates = unstable_cache(
  async (organizationId: string, userId: string, role: MemberRole) => {
    return getCandidatesForUser(organizationId, userId, role);
  },
  ["nav-candidates"], // cache key
  { 
    revalidate: 60, // cache for 60 seconds
    tags: ["candidates", "nav-badges"] // can be invalidated with revalidateTag()
  }
);

/**
 * Get navigation badges from cached candidates data.
 * Much faster than running getCandidatesForUser every page load.
 * Cached for 60 seconds to prevent blocking navigation.
 */
export async function getCachedNavBadges(
  organizationId: string,
  userId: string,
  role: MemberRole
) {
  const candidates = await getCachedCandidates(organizationId, userId, role);
  return getNavPendingCounts(candidates);
}

/**
 * Cached version of getCandidatesGridForUser for the candidates page.
 * Complex multi-join query that runs frequently, cache for 45 seconds.
 */
export const getCachedCandidatesGrid = unstable_cache(
  async (organizationId: string, userId: string, role: MemberRole) => {
    return getCandidatesGridForUser(organizationId, userId, role);
  },
  ["candidates-grid"],
  {
    revalidate: 45,
    tags: ["candidates", "candidates-grid"],
  }
);

/**
 * Cached version of getStageBookings for the dashboard and booking page.
 * Used by multiple high-traffic pages, cache for 45 seconds.
 */
export const getCachedStageBookings = unstable_cache(
  async (organizationId: string) => {
    return getStageBookings(organizationId);
  },
  ["stage-bookings"],
  {
    revalidate: 45,
    tags: ["bookings", "stage-bookings"],
  }
);

/**
 * Cached version of getUserStats for dashboard displays.
 * Queries all candidates, good candidate for short-term caching.
 */
export const getCachedUserStats = unstable_cache(
  async (organizationId: string, userId: string, role: MemberRole) => {
    return getUserStats(organizationId, userId, role);
  },
  ["user-stats"],
  {
    revalidate: 60,
    tags: ["candidates", "user-stats"],
  }
);

/**
 * Cached version of getBookableCandidates for the booking page.
 * Prevents slow queries on every booking page visit.
 */
export const getCachedBookableCandidates = unstable_cache(
  async (organizationId: string) => {
    return getBookableCandidates(organizationId);
  },
  ["bookable-candidates"],
  {
    revalidate: 45,
    tags: ["candidates", "bookable-candidates"],
  }
);
