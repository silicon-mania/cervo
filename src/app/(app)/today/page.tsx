import { CalendarDays, Inbox, Sparkles } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Panel, PanelHeader } from "@/components/primitives/panel";

export default function TodayPage() {
  return (
    <AppShell>
      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 border-r bg-background px-10 py-8">
          <div className="mx-auto max-w-3xl space-y-6">
            <div>
              <p className="font-mono text-xs text-muted-foreground">Today</p>
              <h1 className="text-3xl font-semibold tracking-normal">
                Daily note
              </h1>
            </div>
            <div className="min-h-[560px] rounded-md border border-dashed bg-muted/20 p-6 text-sm leading-6 text-muted-foreground">
              TipTap DocumentEditor will live here. The next milestone is the
              documents table, daily-note auto creation, and autosave.
            </div>
          </div>
        </section>
        <aside className="flex min-w-0 flex-col gap-3 bg-muted/20 p-3">
          <Panel>
            <PanelHeader icon={CalendarDays} title="Calendar" />
            <p className="text-sm text-muted-foreground">
              DB-backed mock events will appear here.
            </p>
          </Panel>
          <Panel>
            <PanelHeader icon={Inbox} title="Inbox" />
            <p className="text-sm text-muted-foreground">
              DB-backed mock messages will appear here.
            </p>
          </Panel>
          <Panel>
            <PanelHeader icon={Sparkles} title="Assistant" />
            <p className="text-sm text-muted-foreground">
              Contextual OpenAI actions will stay behind the central note.
            </p>
          </Panel>
        </aside>
      </main>
    </AppShell>
  );
}
