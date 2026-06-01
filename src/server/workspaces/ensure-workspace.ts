import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import { workspaceMembers, workspaces } from "@/server/db/schema";

export type WorkspaceContext = {
  id: string;
  name: string;
  clerkOrgId: string;
  createdBy: string;
  localRole: "owner" | "admin" | "member";
  isCreator: boolean;
};

type EnsureWorkspaceMirrorInput = {
  clerkUserId: string;
  clerkOrgId: string;
  clerkOrgRole?: string | null;
  forceRefresh?: boolean;
};

function toLocalRole({
  clerkUserId,
  createdBy,
  clerkOrgRole,
}: {
  clerkUserId: string;
  createdBy: string;
  clerkOrgRole?: string | null;
}): WorkspaceContext["localRole"] {
  if (createdBy === clerkUserId) {
    return "owner";
  }

  if (clerkOrgRole === "org:admin") {
    return "admin";
  }

  return "member";
}

export async function ensureWorkspaceMirror({
  clerkUserId,
  clerkOrgId,
  clerkOrgRole,
  forceRefresh = false,
}: EnsureWorkspaceMirrorInput): Promise<WorkspaceContext> {
  const db = getDb();
  const now = new Date();

  const [existingWorkspace] = forceRefresh
    ? []
    : await db
        .select({
          id: workspaces.id,
          name: workspaces.name,
          createdBy: workspaces.createdBy,
        })
        .from(workspaces)
        .where(eq(workspaces.clerkOrgId, clerkOrgId))
        .limit(1);

  if (existingWorkspace) {
    const localRole = toLocalRole({
      clerkUserId,
      createdBy: existingWorkspace.createdBy,
      clerkOrgRole,
    });

    await db
      .insert(workspaceMembers)
      .values({
        workspaceId: existingWorkspace.id,
        clerkUserId,
        role: localRole,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [workspaceMembers.workspaceId, workspaceMembers.clerkUserId],
        set: {
          role: localRole,
          updatedAt: now,
        },
      });

    return {
      id: existingWorkspace.id,
      name: existingWorkspace.name,
      clerkOrgId,
      createdBy: existingWorkspace.createdBy,
      localRole,
      isCreator: existingWorkspace.createdBy === clerkUserId,
    };
  }

  const client = await clerkClient();
  const organization = await client.organizations.getOrganization({
    organizationId: clerkOrgId,
  });

  const [workspace] = await db
    .insert(workspaces)
    .values({
      clerkOrgId,
      name: organization.name,
      slug: organization.slug,
      createdBy: clerkUserId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: workspaces.clerkOrgId,
      set: {
        name: organization.name,
        slug: organization.slug,
        updatedAt: now,
      },
    })
    .returning({
      id: workspaces.id,
      name: workspaces.name,
      createdBy: workspaces.createdBy,
    });

  if (!workspace) {
    throw new Error("Unable to sync workspace.");
  }

  const localRole = toLocalRole({
    clerkUserId,
    createdBy: workspace.createdBy,
    clerkOrgRole,
  });

  await db
    .insert(workspaceMembers)
    .values({
      workspaceId: workspace.id,
      clerkUserId,
      role: localRole,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [workspaceMembers.workspaceId, workspaceMembers.clerkUserId],
      set: {
        role: localRole,
        updatedAt: now,
      },
    });

  return {
    id: workspace.id,
    name: workspace.name,
    clerkOrgId,
    createdBy: workspace.createdBy,
    localRole,
    isCreator: workspace.createdBy === clerkUserId,
  };
}
