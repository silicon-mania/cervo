"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { BoxCard, UnsortedBoxCard } from "@/features/boxes/components/box-card";
import { CreateBoxForm } from "@/features/boxes/components/create-box-form";
import type {
  BoxDocumentSummary,
  BoxSummary,
  LinkedBoxDocumentSummary,
} from "@/features/boxes/server/queries";

type BoxesExplorerProps = {
  initialBoxes: BoxSummary[];
  initialUnsortedDocuments: BoxDocumentSummary[];
  initialLinkedDocuments: LinkedBoxDocumentSummary[];
  loadingDocumentId?: string | null;
  onOpenDocument?: (documentId: string) => void;
};

type ActiveTarget = { type: "root" } | { type: "unsorted" } | { type: "box"; boxId: string };

function sortBoxes(boxes: BoxSummary[]) {
  return [...boxes].sort((a, b) => a.name.localeCompare(b.name));
}

function NoteCard({
  document,
  isLoading = false,
  onOpen,
}: {
  document: BoxDocumentSummary;
  isLoading?: boolean;
  onOpen?: (documentId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(document.id)}
      disabled={!onOpen || isLoading}
      className={cn(
        "flex min-h-36 flex-col justify-between rounded-md border bg-background p-4",
        "text-left transition-colors hover:border-foreground/20 hover:bg-muted/20",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-70",
      )}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-md border bg-muted/30">
          <FileText className="size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">{document.title}</h3>
          {document.date ? (
            <p className="mt-1 font-mono text-xs text-muted-foreground">{document.date}</p>
          ) : null}
        </div>
      </div>
      {isLoading ? (
        <LoaderCircle
          className="mt-4 size-4 animate-spin self-end text-muted-foreground"
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}

export function BoxesExplorer({
  initialBoxes,
  initialUnsortedDocuments,
  initialLinkedDocuments,
  loadingDocumentId,
  onOpenDocument,
}: BoxesExplorerProps) {
  const [boxes, setBoxes] = useState(() => sortBoxes(initialBoxes));
  const [activeTarget, setActiveTarget] = useState<ActiveTarget>({
    type: "root",
  });

  const boxesById = useMemo(() => new Map(boxes.map((box) => [box.id, box])), [boxes]);

  const activeBox = activeTarget.type === "box" ? boxesById.get(activeTarget.boxId) : null;

  const breadcrumbs = useMemo(() => {
    if (!activeBox) {
      return [];
    }

    const path: BoxSummary[] = [];
    let currentBox: BoxSummary | undefined = activeBox;

    for (let depth = 0; currentBox && depth < 12; depth += 1) {
      path.unshift(currentBox);
      currentBox = currentBox.parentBoxId ? boxesById.get(currentBox.parentBoxId) : undefined;
    }

    return path;
  }, [activeBox, boxesById]);

  const visibleBoxes = useMemo(() => {
    if (activeTarget.type === "root") {
      return boxes.filter((box) => !box.parentBoxId);
    }

    if (activeTarget.type === "box") {
      return boxes.filter((box) => box.parentBoxId === activeTarget.boxId);
    }

    return [];
  }, [activeTarget, boxes]);

  const visibleDocuments = useMemo(() => {
    if (activeTarget.type === "unsorted") {
      return initialUnsortedDocuments;
    }

    if (activeTarget.type === "box") {
      return initialLinkedDocuments
        .filter((document) => document.boxId === activeTarget.boxId)
        .map((document) => ({
          id: document.id,
          title: document.title,
          type: document.type,
          date: document.date,
          updatedAt: document.updatedAt,
        }));
    }

    return [];
  }, [activeTarget, initialLinkedDocuments, initialUnsortedDocuments]);

  const handleBoxCreated = useCallback((box: BoxSummary) => {
    setBoxes((currentBoxes) => {
      const withoutDuplicate = currentBoxes.filter((currentBox) => currentBox.id !== box.id);

      return sortBoxes([...withoutDuplicate, box]);
    });
  }, []);

  const goBack = () => {
    if (activeTarget.type === "unsorted") {
      setActiveTarget({ type: "root" });
      return;
    }

    if (!activeBox?.parentBoxId) {
      setActiveTarget({ type: "root" });
      return;
    }

    setActiveTarget({ type: "box", boxId: activeBox.parentBoxId });
  };

  const hasContent =
    activeTarget.type === "root" || visibleBoxes.length > 0 || visibleDocuments.length > 0;

  return (
    <section className="mt-8 pt-6">
      <h2 className="text-2xl font-medium text-center">Memory</h2>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          {activeTarget.type !== "root" ? (
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Back" onClick={goBack}>
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
          ) : null}

          {activeTarget.type === "root" ? null : (
            <nav aria-label="Box path" className="flex min-w-0 items-center gap-1 text-sm">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setActiveTarget({ type: "root" })}>
                Boxes
              </button>
              <ChevronRight
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              {activeTarget.type === "unsorted" ? (
                <span className="truncate text-foreground">Unsorted</span>
              ) : null}
              {breadcrumbs.map((box, index) => {
                const isLast = index === breadcrumbs.length - 1;

                return (
                  <span key={box.id} className="contents">
                    {index > 0 ? (
                      <ChevronRight
                        className="size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    ) : null}
                    {isLast ? (
                      <span className="truncate text-foreground">{box.name}</span>
                    ) : (
                      <button
                        type="button"
                        className="truncate text-muted-foreground hover:text-foreground"
                        onClick={() => setActiveTarget({ type: "box", boxId: box.id })}>
                        {box.name}
                      </button>
                    )}
                  </span>
                );
              })}
            </nav>
          )}
        </div>

        {activeTarget.type !== "unsorted" ? (
          <div className="w-full sm:max-w-sm">
            <CreateBoxForm
              parentBoxId={activeTarget.type === "box" ? activeTarget.boxId : undefined}
              onCreated={handleBoxCreated}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {activeTarget.type === "root" ? (
          <UnsortedBoxCard
            noteCount={initialUnsortedDocuments.length}
            onOpen={() => setActiveTarget({ type: "unsorted" })}
          />
        ) : null}

        {visibleBoxes.map((box) => (
          <BoxCard
            key={box.id}
            box={box}
            onOpen={(boxId) => setActiveTarget({ type: "box", boxId })}
          />
        ))}

        {visibleDocuments.map((document) => (
          <NoteCard
            key={document.id}
            document={document}
            isLoading={loadingDocumentId === document.id}
            onOpen={onOpenDocument}
          />
        ))}
      </div>

      {!hasContent ? (
        <div className="mt-5 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Empty
        </div>
      ) : null}
    </section>
  );
}
