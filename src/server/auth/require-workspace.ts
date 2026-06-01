import { auth } from "@clerk/nextjs/server";

export type WorkspaceAuthContext = {
  clerkUserId: string;
  clerkOrgId: string;
};

export async function requireWorkspace(): Promise<WorkspaceAuthContext> {
  const { userId, orgId } = await auth();

  if (!userId) {
    throw new Error("Authentication required.");
  }

  if (!orgId) {
    throw new Error("Organization required.");
  }

  return {
    clerkUserId: userId,
    clerkOrgId: orgId,
  };
}
