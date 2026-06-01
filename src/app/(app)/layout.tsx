import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { ensureWorkspaceMirror } from "@/server/workspaces/ensure-workspace";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (!orgId) {
    redirect("/onboarding");
  }

  await ensureWorkspaceMirror({
    clerkUserId: userId,
    clerkOrgId: orgId,
    clerkOrgRole: orgRole,
  });

  return children;
}
