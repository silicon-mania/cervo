import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <section className="w-full max-w-sm space-y-6">
        <div className="flex size-10 items-center justify-center rounded-md border bg-muted">
          <Building2 className="size-5" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-normal">
            Create your workspace
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Cervo needs an organization before opening the company memory.
          </p>
        </div>
        <Button className="w-full" disabled>
          Workspace onboarding coming next
        </Button>
      </section>
    </main>
  );
}
