#!/usr/bin/env node
import { db } from "@/lib/db";
import { users, organizationMembers, candidates } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";

async function diagnose() {
  console.log("🔍 Diagnosing Resume Preview Issue\n");

  // Get all users and their organization memberships
  const allUsers = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      memberId: organizationMembers.id,
      organizationId: organizationMembers.organizationId,
      role: organizationMembers.role,
      deletedAt: organizationMembers.deletedAt,
    })
    .from(users)
    .leftJoin(
      organizationMembers,
      eq(users.id, organizationMembers.userId),
    );

  console.log("📋 Users and their organization memberships:");
  console.log("─".repeat(100));
  allUsers.forEach((u) => {
    const status = u.deletedAt ? "❌ DELETED" : "✅ ACTIVE";
    console.log(
      `${status} | ${u.email} (${u.name}) | OrgId: ${u.organizationId} | Role: ${u.role}`,
    );
  });

  // Check for users with multiple organization memberships
  const userOrgCounts = new Map<string, number>();
  allUsers.forEach((u) => {
    if (u.userId && !u.deletedAt) {
      userOrgCounts.set(u.userId, (userOrgCounts.get(u.userId) ?? 0) + 1);
    }
  });

  console.log("\n📊 Users with multiple org memberships:");
  console.log("─".repeat(100));
  let multiOrgUsers = false;
  userOrgCounts.forEach((count, userId) => {
    if (count > 1) {
      const user = allUsers.find((u) => u.userId === userId);
      console.log(`⚠️  ${user?.email}: ${count} organizations`);
      multiOrgUsers = true;
    }
  });
  if (!multiOrgUsers) {
    console.log("✅ All users have exactly 1 active organization membership");
  }

  // Check if there are candidates with mismatched organizationIds
  console.log("\n🎯 Checking for candidates and their organization IDs:");
  console.log("─".repeat(100));
  
  const candidateList = await db
    .select({
      candidateId: candidates.id,
      candidateName: candidates.name,
      organizationId: candidates.organizationId,
      resumeStorageKey: candidates.resumeStorageKey,
      createdById: candidates.createdById,
    })
    .from(candidates)
    .limit(10);

  candidateList.forEach((c) => {
    const creator = allUsers.find((u) => u.userId === c.createdById && !u.deletedAt);
    const hasResume = c.resumeStorageKey ? "✅" : "❌";
    console.log(
      `${hasResume} | ${c.candidateName} | CandidateOrgId: ${c.organizationId} | CreatedBy: ${creator?.email} (OrgId: ${creator?.organizationId})`,
    );
  });

  // Summary
  console.log("\n" + "═".repeat(100));
  console.log("📝 SUMMARY:");
  console.log("═".repeat(100));

  const uniqueOrgIds = new Set(
    allUsers
      .filter((u) => !u.deletedAt && u.organizationId)
      .map((u) => u.organizationId),
  );

  if (uniqueOrgIds.size > 1) {
    console.log(
      `⚠️  PROBLEM FOUND: Users are in ${uniqueOrgIds.size} different organization IDs:`,
    );
    uniqueOrgIds.forEach((id) => {
      const usersInOrg = allUsers.filter(
        (u) => !u.deletedAt && u.organizationId === id,
      );
      console.log(`   - OrgId: ${id} | Users: ${usersInOrg.map((u) => u.email).join(", ")}`);
    });
  } else if (uniqueOrgIds.size === 1) {
    console.log(`✅ All users are in the same organization: ${[...uniqueOrgIds][0]}`);
  } else {
    console.log("❌ No users found with active organization memberships");
  }
}

diagnose().catch(console.error);
