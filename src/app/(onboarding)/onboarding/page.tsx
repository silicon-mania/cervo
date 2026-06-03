import { OrganizationList } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Building2, MailPlus } from "lucide-react";
import { redirect } from "next/navigation";

import { Separator } from "@/components/ui/separator";

export default async function OnboardingPage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (orgId) {
    redirect("/onboarding/sync");
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <section className="w-full max-w-md space-y-6">
        <div className="flex size-10 items-center justify-center rounded-md border bg-muted">
          <Building2 className="size-5" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-normal">Choose your workspace</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Create a workspace or accept an invitation. Existing workspaces are invite-only and
            never shown in a public directory.
          </p>
        </div>
        <div className="rounded-md border bg-background p-4">
          <OrganizationList
            hidePersonal
            skipInvitationScreen
            afterCreateOrganizationUrl="/onboarding/sync"
            afterSelectOrganizationUrl="/onboarding/sync"
            afterSelectPersonalUrl="/onboarding"
          />
        </div>
        <Separator />
        <div className="flex gap-3 text-sm leading-6 text-muted-foreground">
          <MailPlus className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>To join an existing workspace, use the invitation email sent by one of its members.</p>
        </div>
      </section>
    </main>
  );
}
