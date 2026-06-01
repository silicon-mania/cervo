import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { requireWorkspace } from "@/server/auth/require-workspace";

export default async function OnboardingSyncPage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (!orgId) {
    redirect("/onboarding");
  }

  await requireWorkspace({ forceRefresh: true });

  redirect("/today");
}
