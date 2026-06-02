import { OrganizationProfile } from "@clerk/nextjs";
import { Building2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

const settingsSections = [{ id: "workspace", label: "Workspace" }] as const;

export default function SettingsPage() {
  return (
    <AppShell>
      <main className="h-full overflow-y-auto p-6">
        <div className="flex max-w-6xl flex-col gap-6">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-normal">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Workspace, app, and account preferences.
            </p>
          </div>

          <div className="flex gap-2 border-b">
            {settingsSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="border-b-2 border-foreground px-1 pb-3 text-sm font-medium"
              >
                {section.label}
              </a>
            ))}
          </div>

          <section id="workspace" className="min-w-0 max-w-6xl space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              <div>
                <h2 className="text-base font-medium">Workspace</h2>
                <p className="text-sm text-muted-foreground">
                  Organization profile, members, invitations, and roles.
                </p>
              </div>
            </div>

            <OrganizationProfile
              routing="hash"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  cardBox: "w-full shadow-none",
                },
              }}
            />
          </section>
        </div>
      </main>
    </AppShell>
  );
}
