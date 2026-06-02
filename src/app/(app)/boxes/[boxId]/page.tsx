import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, FileText, FolderOpen } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { BoxCard } from "@/features/boxes/components/box-card";
import { BoxStatusBadge } from "@/features/boxes/components/box-status-badge";
import { CreateBoxForm } from "@/features/boxes/components/create-box-form";
import { getBoxPageData } from "@/features/boxes/server/queries";
import { DocumentAutosaveEditor } from "@/features/documents/components/document-autosave-editor";

type BoxPageProps = {
  params: Promise<{
    boxId: string;
  }>;
};

export default async function BoxPage({ params }: BoxPageProps) {
  const { boxId } = await params;
  const data = await getBoxPageData(boxId);

  if (!data) {
    notFound();
  }

  return (
    <AppShell>
      <main className="h-full overflow-y-auto bg-background">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-6 py-7 lg:px-8">
          <nav
            aria-label="Box path"
            className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
          >
            <Link href="/" className="hover:text-foreground">
              Main
            </Link>
            {data.breadcrumbs.map((breadcrumb, index) => {
              const isLast = index === data.breadcrumbs.length - 1;

              return (
                <span key={breadcrumb.id} className="contents">
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                  {isLast ? (
                    <span className="text-foreground">{breadcrumb.name}</span>
                  ) : (
                    <Link
                      href={`/boxes/${breadcrumb.id}`}
                      className="hover:text-foreground"
                    >
                      {breadcrumb.name}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FolderOpen className="size-4 text-muted-foreground" />
                <h1 className="truncate text-xl font-semibold tracking-normal">
                  {data.box.name}
                </h1>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <BoxStatusBadge status={data.box.status} />
                <Badge variant="outline" className="text-muted-foreground">
                  Box
                </Badge>
              </div>
            </div>
            <div className="w-full sm:max-w-sm">
              <CreateBoxForm
                parentBoxId={data.box.id}
                placeholder="Child box name"
                buttonLabel="New Child Box"
              />
            </div>
          </div>

          <DocumentAutosaveEditor
            documentId={data.homeDocument.id}
            title={data.homeDocument.title}
            initialContent={data.homeDocument.contentJson}
            placeholder="Write the box home document..."
            titleClassName="text-2xl"
            sectionClassName="min-h-[520px] border-y py-6"
          />

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-medium">Child Boxes</h2>
                <p className="text-sm text-muted-foreground">
                  Nested project spaces
                </p>
              </div>
            </div>
            {data.childBoxes.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.childBoxes.map((childBox) => (
                  <BoxCard key={childBox.id} box={childBox} />
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No child boxes
              </div>
            )}
          </section>

          <section className="space-y-4 pb-8">
            <div>
              <h2 className="text-base font-medium">Notes</h2>
              <p className="text-sm text-muted-foreground">
                Documents linked to this box
              </p>
            </div>
            {data.linkedDocuments.length > 0 ? (
              <div className="divide-y rounded-md border">
                {data.linkedDocuments.map((document) => (
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
                No linked notes
              </div>
            )}
          </section>
        </div>
      </main>
    </AppShell>
  );
}
