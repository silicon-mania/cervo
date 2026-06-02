import Link from "next/link";
import { ChevronRight, FileText, Inbox } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { getUnsortedDocuments } from "@/features/boxes/server/queries";

export default async function UnsortedBoxPage() {
  const documents = await getUnsortedDocuments();

  return (
    <AppShell>
      <main className="h-full overflow-y-auto bg-background">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-6 py-7 lg:px-8">
          <nav
            aria-label="Box path"
            className="flex items-center gap-1 text-sm text-muted-foreground"
          >
            <Link href="/" className="hover:text-foreground">
              Main
            </Link>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <span className="text-foreground">Unsorted</span>
          </nav>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Inbox className="size-4 text-muted-foreground" />
                <h1 className="text-xl font-semibold tracking-normal">
                  Unsorted
                </h1>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-muted-foreground">
                  System
                </Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  {documents.length === 1 ? "1 note" : `${documents.length} notes`}
                </Badge>
              </div>
            </div>
          </div>

          <section className="space-y-4">
            <div>
              <h2 className="text-base font-medium">Notes</h2>
              <p className="text-sm text-muted-foreground">
                Documents without boxes
              </p>
            </div>
            {documents.length > 0 ? (
              <div className="divide-y rounded-md border">
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {document.title}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {document.date ?? document.type}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No unsorted notes
              </div>
            )}
          </section>
        </div>
      </main>
    </AppShell>
  );
}
