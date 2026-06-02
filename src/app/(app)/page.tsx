import { AppShell } from '@/components/layout/app-shell';
import { BoxesExplorer } from '@/features/boxes/components/boxes-explorer';
import { getMainBoxesData } from '@/features/boxes/server/queries';
import { getOrCreateTodayDocument } from '@/features/daily-notes';
import { TodayEditor } from '@/features/daily-notes/components/today-editor';

export default async function AppHomePage() {
  const { document } = await getOrCreateTodayDocument();
  const boxesData = await getMainBoxesData();

  return (
    <AppShell>
      <main className="h-full overflow-y-auto bg-background">
        <div className="mx-auto flex w-full max-w-5xl flex-col px-6 py-7 lg:px-8 pb-56">
          <TodayEditor
            documentId={document.id}
            title={document.title}
            initialContent={document.contentJson}
            expandable
          />

          <BoxesExplorer
            initialBoxes={boxesData.boxes}
            initialUnsortedDocuments={boxesData.unsortedDocuments}
            initialLinkedDocuments={boxesData.linkedDocuments}
          />
        </div>
      </main>
    </AppShell>
  );
}
