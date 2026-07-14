import { unstable_cache } from "next/cache";
import { getCandidatesForUser } from "./queries";
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
