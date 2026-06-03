"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  FilePenLine,
  FileText,
  LoaderCircle,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

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
import {
  editorDocumentQueryKey,
  fetchEditorDocument,
  type EditorDocument,
} from "@/features/documents/client/queries";

type BoxesExplorerProps = {
  initialMemoryData: RootMemoryData;
  activeDocumentId?: string | null;
  openDocumentError?: string | null;
  loadingDocumentId?: string | null;
  onActiveDocumentDeleted?: () => void;
  onOpenDocument?: (documentId: string) => void;
  onCreateDocument?: (document: EditorDocument) => (() => void) | void;
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

const emptyEditorContent: EditorDocument["contentJson"] = {
  type: "doc",
  content: [],
};

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

type CreateNoteRequest = {
  id: string;
  boxId: string | null;
};

type CreateNoteResponse = {
  document: EditorDocument;
  summary: BoxDocumentSummary;
  boxId: string | null;
  error?: string;
};

type UpdateBoxRequest = {
  boxId: string;
  name: string;
};

type UpdateBoxErrorResponse = {
  error: string;
};

type DeleteBoxRequest = {
  box: BoxSummary;
};

type DeleteBoxResponse = {
  deletedBoxIds: string[];
  deletedDocumentIds: string[];
  preservedDocumentIds: string[];
};

type DeleteBoxErrorResponse = {
  error: string;
};

async function createNoteRequest(input: CreateNoteRequest) {
  const response = await fetch("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => null)) as CreateNoteResponse | null;

  if (!response.ok || !payload?.document || !payload.summary) {
    throw new Error(payload?.error ?? "Unable to create note.");
  }

  return payload;
}

async function updateBoxRequest(input: UpdateBoxRequest) {
  const response = await fetch(`/api/boxes/${encodeURIComponent(input.boxId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: input.name }),
  });
  const payload = (await response.json().catch(() => null)) as
    | BoxSummary
    | UpdateBoxErrorResponse
    | null;

  if (!response.ok || !payload || "error" in payload) {
    const errorMessage = payload && "error" in payload ? payload.error : "Unable to update box.";

    throw new Error(errorMessage);
  }

  return payload;
}

async function deleteBoxRequest(input: DeleteBoxRequest) {
  const response = await fetch(`/api/boxes/${encodeURIComponent(input.box.id)}`, {
    method: "DELETE",
  });
  const payload = (await response.json().catch(() => null)) as
    | DeleteBoxResponse
    | DeleteBoxErrorResponse
    | null;

  if (!response.ok || !payload || "error" in payload) {
    const errorMessage = payload && "error" in payload ? payload.error : "Unable to delete box.";

    throw new Error(errorMessage);
  }

  return payload;
}

function sortDocuments(documents: BoxDocumentSummary[]) {
  return [...documents].sort((a, b) => a.title.localeCompare(b.title));
}

function insertDocument(documents: BoxDocumentSummary[], document: BoxDocumentSummary) {
  const withoutDuplicate = documents.filter(
    (currentDocument) => currentDocument.id !== document.id,
  );

  return sortDocuments([...withoutDuplicate, document]);
}

function replaceDocument(
  documents: BoxDocumentSummary[],
  optimisticDocumentId: string,
  document: BoxDocumentSummary,
) {
  return sortDocuments(
    documents.map((currentDocument) =>
      currentDocument.id === optimisticDocumentId ? document : currentDocument,
    ),
  );
}

function renameBox(box: BoxSummary, name: string): BoxSummary {
  return {
    ...box,
    name,
  };
}

function replaceBox(boxes: BoxSummary[], updatedBox: BoxSummary) {
  return sortBoxes(boxes.map((box) => (box.id === updatedBox.id ? updatedBox : box)));
}

function removeBoxes(boxes: BoxSummary[], boxIds: Set<string>) {
  return boxes.filter((box) => !boxIds.has(box.id));
}

function removeDocuments(documents: BoxDocumentSummary[], documentIds: Set<string>) {
  return documents.filter((document) => !documentIds.has(document.id));
}

function replaceBoxInMemoryData<TData extends RootMemoryData | BoxMemoryData>(
  currentData: TData | undefined,
  updatedBox: BoxSummary,
) {
  if (!currentData) {
    return currentData;
  }

  if ("boxes" in currentData) {
    return {
      ...currentData,
      boxes: replaceBox(currentData.boxes, updatedBox),
    };
  }

  return {
    ...currentData,
    box: currentData.box.id === updatedBox.id ? updatedBox : currentData.box,
    path: currentData.path.map((box) => (box.id === updatedBox.id ? updatedBox : box)),
    childBoxes: replaceBox(currentData.childBoxes, updatedBox),
  };
}

function removeBoxFromMemoryData<TData extends RootMemoryData | BoxMemoryData>(
  currentData: TData | undefined,
  boxId: string,
) {
  if (!currentData) {
    return currentData;
  }

  if ("boxes" in currentData) {
    return {
      ...currentData,
      boxes: currentData.boxes.filter((box) => box.id !== boxId),
    };
  }

  return {
    ...currentData,
    childBoxes: currentData.childBoxes.filter((box) => box.id !== boxId),
  };
}

function reconcileDeletionInMemoryData<TData extends RootMemoryData | BoxMemoryData>(
  currentData: TData | undefined,
  result: DeleteBoxResponse,
): TData | undefined {
  if (!currentData) {
    return currentData;
  }

  const deletedBoxIds = new Set(result.deletedBoxIds);
  const deletedDocumentIds = new Set(result.deletedDocumentIds);

  if ("boxes" in currentData) {
    return {
      ...currentData,
      boxes: removeBoxes(currentData.boxes, deletedBoxIds),
      unsortedDocuments: removeDocuments(currentData.unsortedDocuments, deletedDocumentIds),
    };
  }

  if (deletedBoxIds.has(currentData.box.id)) {
    return undefined;
  }

  return {
    ...currentData,
    path: removeBoxes(currentData.path, deletedBoxIds),
    childBoxes: removeBoxes(currentData.childBoxes, deletedBoxIds),
    documents: removeDocuments(currentData.documents, deletedDocumentIds),
  };
}

type CreateNoteContext = {
  optimisticDocumentId: string;
  boxId: string | null;
  previousRootMemory?: RootMemoryData;
  previousBoxMemory?: BoxMemoryData;
  restoreActiveDocument?: () => void;
};

type UpdateBoxContext = {
  previousMemoryQueries: [readonly unknown[], RootMemoryData | BoxMemoryData | undefined][];
  optimisticBox: BoxSummary;
};

type DeleteBoxContext = {
  previousMemoryQueries: [readonly unknown[], RootMemoryData | BoxMemoryData | undefined][];
};

function DeleteBoxConfirmation({
  box,
  onCancel,
  onConfirm,
}: {
  box: BoxSummary;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = `delete-box-title-${box.id}`;
  const descriptionId = `delete-box-description-${box.id}`;

  useEffect(() => {
    cancelButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 py-8 backdrop-blur-sm"
      role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-sm rounded-md border bg-background p-4 shadow-lg">
        <div className="space-y-2">
          <h3 id={titleId} className="text-base font-medium">
            Delete &ldquo;{box.name}&rdquo;?
          </h3>
          <p id={descriptionId} className="text-sm leading-6 text-muted-foreground">
            This will permanently delete this box, its child boxes, and notes placed only inside
            them. Notes also placed in another box will be kept.
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button ref={cancelButtonRef} type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
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
        "min-w-0 text-left",
        "group flex flex-col justify-between rounded-md border bg-background p-4",
        "transition-colors hover:border-foreground/20 hover:bg-muted/20",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-70",
      )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <div className="flex size-10 shrink-0 items-center justify-center">
            <FileText className="size-6 text-muted-foreground group-hover:hidden" />
            <FilePenLine className="hidden size-6 text-foreground group-hover:block" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium" title={document.title}>
              {document.title}
            </h3>
            <p className="mt-1 truncate text-xs text-muted-foreground">...</p>
          </div>
        </div>
        {isLoading ? (
          <LoaderCircle
            className="size-4 shrink-0 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        ) : (
          <ArrowUp className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
    </button>
  );
}

export function BoxesExplorer({
  initialMemoryData,
  activeDocumentId,
  openDocumentError,
  loadingDocumentId,
  onActiveDocumentDeleted,
  onOpenDocument,
  onCreateDocument,
}: BoxesExplorerProps) {
  const queryClient = useQueryClient();
  const [activeTarget, setActiveTarget] = useState<ActiveTarget>({
    type: "root",
  });
  const [boxPendingDeletion, setBoxPendingDeletion] = useState<BoxSummary | null>(null);

  const rootMemoryQuery = useQuery({
    queryKey: rootMemoryQueryKey,
    queryFn: () => fetchMemoryData<RootMemoryData>(),
    initialData: initialMemoryData,
  });

  const activeBoxId = activeTarget.type === "box" ? activeTarget.boxId : null;
  const isOptimisticBoxTarget = activeTarget.type === "box" && Boolean(activeTarget.optimisticBox);
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
  }, [
    activeTarget.type,
    boxMemory?.documents,
    isOptimisticBoxTarget,
    rootMemory.unsortedDocuments,
  ]);

  const createNoteMutation = useMutation<
    CreateNoteResponse,
    Error,
    CreateNoteRequest,
    CreateNoteContext
  >({
    mutationFn: createNoteRequest,
    onMutate: async (input) => {
      const optimisticDocument: EditorDocument = {
        id: input.id,
        title: "Undefined",
        type: "note",
        date: null,
        contentJson: emptyEditorContent,
        contentText: "",
      };
      const optimisticSummary: BoxDocumentSummary = {
        id: input.id,
        title: "Undefined",
        type: "note",
        date: null,
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData(editorDocumentQueryKey(input.id), optimisticDocument);
      const restoreActiveDocument = onCreateDocument?.(optimisticDocument) ?? undefined;

      if (!input.boxId) {
        await queryClient.cancelQueries({ queryKey: rootMemoryQueryKey });
        const previousRootMemory = queryClient.getQueryData<RootMemoryData>(rootMemoryQueryKey);

        queryClient.setQueryData<RootMemoryData>(rootMemoryQueryKey, (currentData) => {
          if (!currentData) {
            return currentData;
          }

          return {
            ...currentData,
            unsortedDocuments: insertDocument(currentData.unsortedDocuments, optimisticSummary),
          };
        });

        return {
          optimisticDocumentId: input.id,
          boxId: input.boxId,
          previousRootMemory,
          restoreActiveDocument,
        };
      }

      const queryKey = boxMemoryQueryKey(input.boxId);
      await queryClient.cancelQueries({ queryKey });
      const previousBoxMemory = queryClient.getQueryData<BoxMemoryData>(queryKey);

      queryClient.setQueryData<BoxMemoryData>(queryKey, (currentData) => {
        if (!currentData) {
          return currentData;
        }

        return {
          ...currentData,
          documents: insertDocument(currentData.documents, optimisticSummary),
        };
      });

      return {
        optimisticDocumentId: input.id,
        boxId: input.boxId,
        previousBoxMemory,
        restoreActiveDocument,
      };
    },
    onSuccess: (note, _input, context) => {
      queryClient.setQueryData(editorDocumentQueryKey(note.document.id), note.document);

      if (!context.boxId) {
        queryClient.setQueryData<RootMemoryData>(rootMemoryQueryKey, (currentData) => {
          if (!currentData) {
            return currentData;
          }

          return {
            ...currentData,
            unsortedDocuments: replaceDocument(
              currentData.unsortedDocuments,
              context.optimisticDocumentId,
              note.summary,
            ),
          };
        });
        void queryClient.invalidateQueries({ queryKey: ["memory"] });
        return;
      }

      queryClient.setQueryData<BoxMemoryData>(boxMemoryQueryKey(context.boxId), (currentData) => {
        if (!currentData) {
          return currentData;
        }

        return {
          ...currentData,
          documents: replaceDocument(
            currentData.documents,
            context.optimisticDocumentId,
            note.summary,
          ),
        };
      });
      void queryClient.invalidateQueries({ queryKey: ["memory"] });
    },
    onError: (_error, _input, context) => {
      if (!context) {
        return;
      }

      queryClient.removeQueries({
        queryKey: editorDocumentQueryKey(context.optimisticDocumentId),
        exact: true,
      });

      if (!context.boxId) {
        queryClient.setQueryData(rootMemoryQueryKey, context.previousRootMemory);
      } else {
        queryClient.setQueryData(boxMemoryQueryKey(context.boxId), context.previousBoxMemory);
      }

      context.restoreActiveDocument?.();
      toast.error("Note could not be created. Try again in a moment.");
    },
  });

  const updateBoxMutation = useMutation<BoxSummary, Error, UpdateBoxRequest, UpdateBoxContext>({
    mutationFn: updateBoxRequest,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["memory"] });

      const previousMemoryQueries = queryClient.getQueriesData<RootMemoryData | BoxMemoryData>({
        queryKey: ["memory"],
      });
      let optimisticBox: BoxSummary | null = null;

      for (const [, data] of previousMemoryQueries) {
        if (!data) {
          continue;
        }

        if ("boxes" in data) {
          optimisticBox = data.boxes.find((box) => box.id === input.boxId) ?? optimisticBox;
          continue;
        }

        if (data.box.id === input.boxId) {
          optimisticBox = data.box;
          continue;
        }

        optimisticBox =
          data.path.find((box) => box.id === input.boxId) ??
          data.childBoxes.find((box) => box.id === input.boxId) ??
          optimisticBox;
      }

      if (!optimisticBox) {
        optimisticBox = {
          id: input.boxId,
          name: input.name,
          slug: "optimistic",
          status: "active",
          parentBoxId: null,
          homeDocumentId: null,
          directNoteCount: 0,
          directBoxCount: 0,
        };
      }

      const renamedBox = renameBox(optimisticBox, input.name);

      queryClient.setQueriesData<RootMemoryData | BoxMemoryData>(
        { queryKey: ["memory"] },
        (currentData) => replaceBoxInMemoryData(currentData, renamedBox),
      );

      return {
        previousMemoryQueries,
        optimisticBox: renamedBox,
      };
    },
    onSuccess: (box) => {
      queryClient.setQueriesData<RootMemoryData | BoxMemoryData>(
        { queryKey: ["memory"] },
        (currentData) => replaceBoxInMemoryData(currentData, box),
      );
    },
    onError: (error, _input, context) => {
      for (const [queryKey, data] of context?.previousMemoryQueries ?? []) {
        queryClient.setQueryData(queryKey, data);
      }

      toast.error(error.message);
    },
  });

  const deleteBoxMutation = useMutation<
    DeleteBoxResponse,
    Error,
    DeleteBoxRequest,
    DeleteBoxContext
  >({
    mutationFn: deleteBoxRequest,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["memory"] });

      const previousMemoryQueries = queryClient.getQueriesData<RootMemoryData | BoxMemoryData>({
        queryKey: ["memory"],
      });

      queryClient.setQueriesData<RootMemoryData | BoxMemoryData>(
        { queryKey: ["memory"] },
        (currentData) => removeBoxFromMemoryData(currentData, input.box.id),
      );

      return {
        previousMemoryQueries,
      };
    },
    onSuccess: (result) => {
      queryClient.setQueriesData<RootMemoryData | BoxMemoryData>(
        { queryKey: ["memory"] },
        (currentData) => reconcileDeletionInMemoryData(currentData, result),
      );

      for (const boxId of result.deletedBoxIds) {
        queryClient.removeQueries({ queryKey: boxMemoryQueryKey(boxId), exact: true });
      }

      for (const documentId of result.deletedDocumentIds) {
        queryClient.removeQueries({
          queryKey: editorDocumentQueryKey(documentId),
          exact: true,
        });
      }

      if (activeDocumentId && result.deletedDocumentIds.includes(activeDocumentId)) {
        onActiveDocumentDeleted?.();
      }

      void queryClient.invalidateQueries({ queryKey: ["memory"] });
    },
    onError: (_error, _input, context) => {
      for (const [queryKey, data] of context?.previousMemoryQueries ?? []) {
        queryClient.setQueryData(queryKey, data);
      }

      toast.error("Box could not be deleted. Try again in a moment.");
    },
  });

  useEffect(() => {
    for (const document of visibleDocuments) {
      queryClient.prefetchQuery({
        queryKey: editorDocumentQueryKey(document.id),
        queryFn: () => fetchEditorDocument(document.id),
      });
    }
  }, [queryClient, visibleDocuments]);

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

  const handleBoxRename = useCallback(
    (box: BoxSummary, name: string) => {
      updateBoxMutation.mutate({
        boxId: box.id,
        name,
      });
    },
    [updateBoxMutation],
  );

  const handleBoxDeleteRequest = useCallback((box: BoxSummary) => {
    setBoxPendingDeletion(box);
  }, []);

  const confirmBoxDeletion = useCallback(() => {
    const box = boxPendingDeletion;

    if (!box) {
      return;
    }

    setBoxPendingDeletion(null);
    deleteBoxMutation.mutate({ box });
  }, [boxPendingDeletion, deleteBoxMutation]);

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

  const createNote = () => {
    if (activeTarget.type === "box" && isOptimisticBoxTarget) {
      return;
    }

    createNoteMutation.mutate({
      id: crypto.randomUUID(),
      boxId: activeTarget.type === "box" ? activeTarget.boxId : null,
    });
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

        <div className="flex w-full flex-col gap-2 sm:max-w-lg sm:flex-row sm:justify-end">
          {!isOptimisticBoxTarget ? (
            <Button type="button" variant="outline" className="gap-2" onClick={createNote}>
              <Plus className="size-4" aria-hidden="true" />
              <span>New Note</span>
            </Button>
          ) : null}

          {activeTarget.type !== "unsorted" ? (
            <div className="min-w-0 flex-1 sm:max-w-sm">
              <CreateBoxForm
                parentBoxId={activeTarget.type === "box" ? activeTarget.boxId : undefined}
                onCreated={handleBoxCreated}
                onCreateFailed={handleBoxCreateFailed}
              />
            </div>
          ) : null}
        </div>
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
            onRename={handleBoxRename}
            onDeleteRequest={handleBoxDeleteRequest}
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

      {openDocumentError ? (
        <div
          className="mt-5 rounded-md border border-dashed p-4 text-sm text-muted-foreground"
          role="alert">
          {openDocumentError}
        </div>
      ) : null}

      {!hasContent ? (
        <div className="mt-5 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Empty
        </div>
      ) : null}

      {boxPendingDeletion ? (
        <DeleteBoxConfirmation
          box={boxPendingDeletion}
          onCancel={() => setBoxPendingDeletion(null)}
          onConfirm={confirmBoxDeletion}
        />
      ) : null}
    </section>
  );
}
