import { CalendarDays, Inbox, Sparkles } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Panel, PanelHeader } from "@/components/primitives/panel";
import { getOrCreateTodayDocument } from "@/features/daily-notes";
import { TodayEditor } from "@/features/daily-notes/components/today-editor";

export default async function TodayPage() {
  const { document } = await getOrCreateTodayDocument();

  return (
    <AppShell>
      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 border-r bg-background px-10 py-8">
          <div className="mx-auto max-w-3xl space-y-6">
            <TodayEditor
              documentId={document.id}
              title={document.title}
              initialContent={document.contentJson}
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
