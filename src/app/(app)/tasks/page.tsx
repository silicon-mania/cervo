import { AppShell } from "@/components/layout/app-shell";

export default function TasksPage() {
  return (
    <AppShell>
      <main className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Tasks will stay linked to their source documents and boxes.
      </main>
    </AppShell>
  );
}
