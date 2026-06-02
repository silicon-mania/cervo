import { CalendarDays, Inbox, Sparkles } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Panel, PanelHeader } from "@/components/primitives/panel";
import { getOrCreateTodayDocument } from "@/features/daily-notes";

export default async function TodayPage() {
  await getOrCreateTodayDocument();

  return (
    <AppShell>
      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 border-r bg-background px-10 py-8">
          <div className="mx-auto max-w-3xl space-y-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                Daily note
              </h1>
            </div>
            <div
              aria-label="Daily note editor"
              className="min-h-[560px] rounded-md border border-dashed bg-muted/20"
            />
          </div>
        </section>
        <aside className="flex min-w-0 flex-col gap-3 bg-muted/20 p-3">
          <Panel className="min-h-24">
            <PanelHeader icon={CalendarDays} title="Calendar" />
          </Panel>
          <Panel className="min-h-24">
            <PanelHeader icon={Inbox} title="Inbox" />
          </Panel>
          <Panel className="min-h-24">
            <PanelHeader icon={Sparkles} title="Assistant" />
          </Panel>
        </aside>
      </main>
    </AppShell>
  );
}
