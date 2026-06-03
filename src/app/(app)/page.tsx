import { AppShell } from "@/components/layout/app-shell";
import { getRootMemoryData } from "@/features/boxes/server/queries";
import { getTodayDocumentForEditor } from "@/features/daily-notes";

import { MainWorkspace } from "./main-workspace";

export default async function AppHomePage() {
  const { document } = await getTodayDocumentForEditor();
  const memoryData = await getRootMemoryData();

  return (
    <AppShell>
      <main className="h-full overflow-y-auto bg-background">
        <div className="mx-auto flex w-full max-w-5xl flex-col px-6 py-7 lg:px-8 pb-56">
          <MainWorkspace
            initialDocument={{
              clientKey: document.id ?? `daily-note:${document.date}`,
              id: document.id,
              persistence: document.persistence,
              title: document.title,
              type: "daily_note",
              date: document.date,
              contentJson: document.contentJson,
              contentText: document.contentText,
            }}
            initialMemoryData={memoryData}
          />
        </div>
      </main>
    </AppShell>
  );
}
