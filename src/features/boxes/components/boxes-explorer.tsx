"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FileText, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { BoxCard, UnsortedBoxCard } from "@/features/boxes/components/box-card";
import { CreateBoxForm } from "@/features/boxes/components/create-box-form";
import type {
  BoxDocumentSummary,
  BoxMemoryData,
  BoxSummary,
  RootMemoryData,
} from "@/features/boxes/server/queries";

type BoxesExplorerProps = {
  initialMemoryData: RootMemoryData;
  loadingDocumentId?: string | null;
  onOpenDocument?: (documentId: string) => void;
};

type ActiveTarget =
  | { type: "root" }
  | { type: "unsorted" }
  | {
      type: "box";
      boxId: string;
      optimisticBox?: BoxSummary;
      optimisticPath?: BoxSummary[];
    };

function sortBoxes(boxes: BoxSummary[]) {
  return [...boxes].sort((a, b) => a.name.localeCompare(b.name));
}

const rootMemoryQueryKey = ["memory", "root"] as const;

function boxMemoryQueryKey(boxId: string) {
  return ["memory", "box", boxId] as const;
}

type MemoryResponse<T> = {
  data?: T;
  error?: string;
};

async function fetchMemoryData<T>(boxId?: string): Promise<T> {
  const path = boxId ? `/api/memory?boxId=${encodeURIComponent(boxId)}` : "/api/memory";
  const response = await fetch(path);
  const payload = (await response.json().catch(() => null)) as MemoryResponse<T> | null;

  if (!response.ok || !payload?.data) {
    throw new Error(payload?.error ?? "Unable to load Memory.");
  }

  return payload.data;
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
  initialMemoryData,
  loadingDocumentId,
  onOpenDocument,
}: BoxesExplorerProps) {
  const [activeTarget, setActiveTarget] = useState<ActiveTarget>({
    type: "root",
  });

  const rootMemoryQuery = useQuery({
    queryKey: rootMemoryQueryKey,
    queryFn: () => fetchMemoryData<RootMemoryData>(),
    initialData: initialMemoryData,
  });

  const activeBoxId = activeTarget.type === "box" ? activeTarget.boxId : null;
  const isOptimisticBoxTarget =
    activeTarget.type === "box" && Boolean(activeTarget.optimisticBox);
  const boxMemoryQuery = useQuery({
    queryKey: activeBoxId ? boxMemoryQueryKey(activeBoxId) : ["memory", "box", "idle"],
    queryFn: () => fetchMemoryData<BoxMemoryData>(activeBoxId ?? undefined),
    enabled: Boolean(activeBoxId) && !isOptimisticBoxTarget,
  });

  const rootMemory = rootMemoryQuery.data;
  const boxMemory =
    activeTarget.type === "box" && !isOptimisticBoxTarget ? boxMemoryQuery.data : null;
  const activeBox =
    activeTarget.type === "box" ? (activeTarget.optimisticBox ?? boxMemory?.box ?? null) : null;
  const breadcrumbs = useMemo(() => {
    if (activeTarget.type === "box" && activeTarget.optimisticPath) {
      return activeTarget.optimisticPath;
    }

    return boxMemory?.path ?? [];
  }, [activeTarget, boxMemory?.path]);

  const visibleBoxes = useMemo<BoxSummary[]>(() => {
    if (activeTarget.type === "root") {
      return sortBoxes(rootMemory.boxes);
    }

    if (activeTarget.type === "box" && !isOptimisticBoxTarget) {
      return sortBoxes(boxMemory?.childBoxes ?? []);
    }

    return [];
  }, [activeTarget.type, boxMemory?.childBoxes, isOptimisticBoxTarget, rootMemory.boxes]);

  const visibleDocuments = useMemo<BoxDocumentSummary[]>(() => {
    if (activeTarget.type === "unsorted") {
      return rootMemory.unsortedDocuments;
    }

    if (activeTarget.type === "box" && !isOptimisticBoxTarget) {
      return boxMemory?.documents ?? [];
    }

    return [];
  }, [activeTarget.type, boxMemory?.documents, isOptimisticBoxTarget, rootMemory.unsortedDocuments]);

  const openBox = useCallback(
    (box: BoxSummary) => {
      if (box.slug === "optimistic") {
        setActiveTarget({
          type: "box",
          boxId: box.id,
          optimisticBox: box,
          optimisticPath: [...breadcrumbs, box],
        });
        return;
      }

      setActiveTarget({ type: "box", boxId: box.id });
    },
    [breadcrumbs],
  );

  const handleBoxCreated = useCallback((box: BoxSummary) => {
    setActiveTarget((currentTarget) => {
      if (
        currentTarget.type !== "box" ||
        !currentTarget.optimisticBox ||
        currentTarget.optimisticBox.id !== box.id
      ) {
        return currentTarget;
      }

      return { type: "box", boxId: box.id };
    });
  }, []);

  const handleBoxCreateFailed = useCallback((boxId: string, parentBoxId: string | null) => {
    setActiveTarget((currentTarget) => {
      if (
        currentTarget.type !== "box" ||
        !currentTarget.optimisticBox ||
        currentTarget.optimisticBox.id !== boxId
      ) {
        return currentTarget;
      }

      if (!parentBoxId) {
        return { type: "root" };
      }

      return { type: "box", boxId: parentBoxId };
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
  const isMemoryLoading = activeTarget.type === "box" && boxMemoryQuery.isLoading;
  const memoryError = rootMemoryQuery.isError || boxMemoryQuery.isError;

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
              {activeTarget.type === "box" && breadcrumbs.length === 0 ? (
                <span className="truncate text-muted-foreground">
                  {isMemoryLoading ? "Loading" : "Box"}
                </span>
              ) : null}
            </nav>
          )}
        </div>

        {activeTarget.type !== "unsorted" ? (
          <div className="w-full sm:max-w-sm">
            <CreateBoxForm
              parentBoxId={activeTarget.type === "box" ? activeTarget.boxId : undefined}
              onCreated={handleBoxCreated}
              onCreateFailed={handleBoxCreateFailed}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {activeTarget.type === "root" ? (
          <UnsortedBoxCard
            noteCount={rootMemory.unsortedDocuments.length}
            onOpen={() => setActiveTarget({ type: "unsorted" })}
          />
        ) : null}

        {visibleBoxes.map((box) => (
          <BoxCard
            key={box.id}
            box={box}
            onOpen={openBox}
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

      {isMemoryLoading ? (
        <div className="mt-5 flex items-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Loading Memory
        </div>
      ) : null}

      {memoryError ? (
        <div
          className="mt-5 rounded-md border border-dashed p-4 text-sm text-muted-foreground"
          role="alert">
          Memory could not load. Try again in a moment.
        </div>
      ) : null}

      {!hasContent ? (
        <div className="mt-5 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Empty
        </div>
      ) : null}
    </section>
  );
}
