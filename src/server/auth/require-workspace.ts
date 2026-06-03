import { auth } from "@clerk/nextjs/server";

import { ensureWorkspaceMirror, type WorkspaceContext } from "@/server/workspaces/ensure-workspace";

export type WorkspaceAuthContext = {
  clerkUserId: string;
  clerkOrgId: string;
  clerkOrgRole: string | null | undefined;
  workspace: WorkspaceContext;
};

export async function requireWorkspace(options?: {
  forceRefresh?: boolean;
}): Promise<WorkspaceAuthContext> {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    throw new Error("Authentication required.");
  }

  if (!orgId) {
    throw new Error("Organization required.");
  }

  return {
    clerkUserId: userId,
    clerkOrgId: orgId,
    clerkOrgRole: orgRole,
    workspace: await ensureWorkspaceMirror({
      clerkUserId: userId,
      clerkOrgId: orgId,
      clerkOrgRole: orgRole,
      forceRefresh: options?.forceRefresh,
    }),
  };
}
