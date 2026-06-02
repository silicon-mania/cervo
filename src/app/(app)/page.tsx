import { AppShell } from "@/components/layout/app-shell";
import {
  BoxCard,
  UnsortedBoxCard,
} from "@/features/boxes/components/box-card";
import { CreateBoxForm } from "@/features/boxes/components/create-box-form";
import {
  getTopLevelBoxes,
  getUnsortedNoteCount,
} from "@/features/boxes/server/queries";
import { getOrCreateTodayDocument } from "@/features/daily-notes";
import { TodayEditor } from "@/features/daily-notes/components/today-editor";

export default async function AppHomePage() {
  const { document } = await getOrCreateTodayDocument();
  const [topLevelBoxes, unsortedNoteCount] = await Promise.all([
    getTopLevelBoxes(),
    getUnsortedNoteCount(),
  ]);

  return (
    <AppShell>
      <main className="h-full overflow-y-auto bg-background">
        <div className="mx-auto flex w-full max-w-5xl flex-col px-6 py-7 lg:px-8">
          <TodayEditor
            documentId={document.id}
            title={document.title}
            initialContent={document.contentJson}
            expandable
          />

          <section className="mt-8 border-t pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-base font-medium">Boxes</h2>
                <p className="text-sm text-muted-foreground">
                  Top-level project boxes
                </p>
              </div>
              <div className="w-full sm:max-w-sm">
                <CreateBoxForm />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <UnsortedBoxCard noteCount={unsortedNoteCount} />
              {topLevelBoxes.map((box) => (
                <BoxCard key={box.id} box={box} />
              ))}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
