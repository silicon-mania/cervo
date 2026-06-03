"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, LoaderCircle, Package } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type {
  BoxDocumentSummary,
  BoxMemoryData,
  BoxSummary,
  DocumentBoxPlacementsData,
  RootMemoryData,
} from "@/features/boxes/server/queries";

type AddToBoxPopoverProps = {
  documentId: string;
};

type PlacementMutationInput = {
  action: "add" | "remove";
  boxId: string;
};

type PlacementMutationResponse = {
  box: BoxSummary;
  document: BoxDocumentSummary;
  error?: string;
};

type PlacementMutationContext = {
  action: "add" | "remove";
  boxId: string;
  previousPlacementData?: DocumentBoxPlacementsData;
  previousRootMemory?: RootMemoryData;
  previousBoxMemory?: BoxMemoryData;
  wasFirstPlacement: boolean;
  wasLastPlacement: boolean;
};

const rootMemoryQueryKey = ["memory", "root"] as const;

function boxMemoryQueryKey(boxId: string) {
  return ["memory", "box", boxId] as const;
}

function documentBoxPlacementsQueryKey(documentId: string) {
  return ["documents", documentId, "box-placements"] as const;
}

async function fetchDocumentBoxPlacements(documentId: string) {
  const response = await fetch(
    `/api/documents/${encodeURIComponent(documentId)}/box-placements`,
  );
  const payload = (await response.json().catch(() => null)) as
    | { data?: DocumentBoxPlacementsData; error?: string }
    | null;

  if (!response.ok || !payload?.data) {
    throw new Error(payload?.error ?? "Unable to load box placements.");
  }

  return payload.data;
}

async function mutatePlacement(documentId: string, input: PlacementMutationInput) {
  const response = await fetch(
    `/api/documents/${encodeURIComponent(documentId)}/box-placements`,
    {
      method: input.action === "add" ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boxId: input.boxId }),
    },
  );
  const payload = (await response.json().catch(() => null)) as PlacementMutationResponse | null;

  if (!response.ok || !payload || payload.error) {
    throw new Error(payload?.error ?? "Unable to update box placement.");
  }

  return payload;
}

function sortBoxes(boxes: BoxSummary[]) {
  return [...boxes].sort((a, b) => a.name.localeCompare(b.name));
}

function insertBox(boxes: BoxSummary[], box: BoxSummary) {
  const withoutDuplicate = boxes.filter((currentBox) => currentBox.id !== box.id);

  return sortBoxes([...withoutDuplicate, box]);
}

function removeBox(boxes: BoxSummary[], boxId: string) {
  return boxes.filter((box) => box.id !== boxId);
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

function removeDocument(documents: BoxDocumentSummary[], documentId: string) {
  return documents.filter((document) => document.id !== documentId);
}

function buildBoxPath(box: BoxSummary, boxById: Map<string, BoxSummary>) {
  const names = [box.name];
  let parentBoxId = box.parentBoxId;

  for (let depth = 0; parentBoxId && depth < 12; depth += 1) {
    const parentBox = boxById.get(parentBoxId);

    if (!parentBox) {
      break;
    }

    names.unshift(parentBox.name);
    parentBoxId = parentBox.parentBoxId;
  }

  return names;
}

function truncateBoxName(name: string) {
  return name.length > 7 ? name.slice(0, 7) : name;
}

function BoxPathLabel({ path }: { path: string[] }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center">
      {path.map((name, index) => (
        <span key={`${name}-${index}`} className="inline-flex min-w-0 items-center">
          {index > 0 ? (
            <span className="px-1 text-xs font-bold text-foreground/70" aria-hidden="true">
              /
            </span>
          ) : null}
          <span
            title={name}
            className="max-w-16 truncate rounded-sm bg-muted/60 px-1 py-0.5 font-medium">
            {truncateBoxName(name)}
          </span>
        </span>
      ))}
    </span>
  );
}

export function AddToBoxPopover({ documentId }: AddToBoxPopoverProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const queryKey = documentBoxPlacementsQueryKey(documentId);

  const placementsQuery = useQuery({
    queryKey,
    queryFn: () => fetchDocumentBoxPlacements(documentId),
    enabled: isOpen,
  });

  const placementMutation = useMutation<
    PlacementMutationResponse,
    Error,
    PlacementMutationInput,
    PlacementMutationContext
  >({
    scope: { id: `document-box-placements:${documentId}` },
    mutationFn: (input) => mutatePlacement(documentId, input),
    onMutate: async (input) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey }),
        queryClient.cancelQueries({ queryKey: rootMemoryQueryKey }),
        queryClient.cancelQueries({ queryKey: boxMemoryQueryKey(input.boxId) }),
      ]);

      const previousPlacementData =
        queryClient.getQueryData<DocumentBoxPlacementsData>(queryKey);
      const previousRootMemory = queryClient.getQueryData<RootMemoryData>(rootMemoryQueryKey);
      const previousBoxMemory = queryClient.getQueryData<BoxMemoryData>(
        boxMemoryQueryKey(input.boxId),
      );
      const targetBox = previousPlacementData?.boxes.find((box) => box.id === input.boxId);
      const targetDocument = previousPlacementData?.document;
      const wasPlaced = Boolean(
        previousPlacementData?.placements.some((box) => box.id === input.boxId),
      );
      const wasFirstPlacement =
        input.action === "add" && previousPlacementData?.placements.length === 0;
      const wasLastPlacement =
        input.action === "remove" && wasPlaced && previousPlacementData?.placements.length === 1;

      if (targetBox) {
        queryClient.setQueryData<DocumentBoxPlacementsData>(queryKey, (currentData) => {
          if (!currentData) {
            return currentData;
          }

          return {
            ...currentData,
            placements:
              input.action === "add"
                ? insertBox(currentData.placements, targetBox)
                : removeBox(currentData.placements, input.boxId),
          };
        });
      }

      if (targetDocument && wasFirstPlacement) {
        queryClient.setQueryData<RootMemoryData>(rootMemoryQueryKey, (currentData) => {
          if (!currentData) {
            return currentData;
          }

          return {
            ...currentData,
            unsortedDocuments: removeDocument(currentData.unsortedDocuments, targetDocument.id),
          };
        });
      }

      if (targetDocument && wasLastPlacement) {
        queryClient.setQueryData<RootMemoryData>(rootMemoryQueryKey, (currentData) => {
          if (!currentData) {
            return currentData;
          }

          return {
            ...currentData,
            unsortedDocuments: insertDocument(currentData.unsortedDocuments, targetDocument),
          };
        });
      }

      if (targetDocument) {
        queryClient.setQueryData<BoxMemoryData>(boxMemoryQueryKey(input.boxId), (currentData) => {
          if (!currentData) {
            return currentData;
          }

          return {
            ...currentData,
            documents:
              input.action === "add"
                ? insertDocument(currentData.documents, targetDocument)
                : removeDocument(currentData.documents, targetDocument.id),
          };
        });
      }

      return {
        action: input.action,
        boxId: input.boxId,
        previousPlacementData,
        previousRootMemory,
        previousBoxMemory,
        wasFirstPlacement,
        wasLastPlacement,
      };
    },
    onSuccess: (placement, _input, context) => {
      queryClient.setQueryData<DocumentBoxPlacementsData>(queryKey, (currentData) => {
        if (!currentData) {
          return currentData;
        }

        return {
          ...currentData,
          document: placement.document,
          placements:
            context.action === "add"
              ? insertBox(currentData.placements, placement.box)
              : removeBox(currentData.placements, placement.box.id),
        };
      });

      queryClient.setQueryData<BoxMemoryData>(boxMemoryQueryKey(context.boxId), (currentData) => {
        if (!currentData) {
          return currentData;
        }

        return {
          ...currentData,
          documents:
            context.action === "add"
              ? insertDocument(currentData.documents, placement.document)
              : removeDocument(currentData.documents, placement.document.id),
        };
      });

      if (context.wasFirstPlacement) {
        queryClient.setQueryData<RootMemoryData>(rootMemoryQueryKey, (currentData) => {
          if (!currentData) {
            return currentData;
          }

          return {
            ...currentData,
            unsortedDocuments: removeDocument(currentData.unsortedDocuments, placement.document.id),
          };
        });
      }

      if (context.wasLastPlacement) {
        queryClient.setQueryData<RootMemoryData>(rootMemoryQueryKey, (currentData) => {
          if (!currentData) {
            return currentData;
          }

          return {
            ...currentData,
            unsortedDocuments: insertDocument(currentData.unsortedDocuments, placement.document),
          };
        });
      }
    },
    onError: (error, _input, context) => {
      if (context?.previousPlacementData) {
        queryClient.setQueryData(queryKey, context.previousPlacementData);
      }

      if (context?.previousRootMemory) {
        queryClient.setQueryData(rootMemoryQueryKey, context.previousRootMemory);
      }

      if (context?.previousBoxMemory) {
        queryClient.setQueryData(boxMemoryQueryKey(context.boxId), context.previousBoxMemory);
      }

      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const data = placementsQuery.data;
  const selectedBoxIds = useMemo(
    () => new Set(data?.placements.map((box) => box.id) ?? []),
    [data?.placements],
  );
  const boxes = useMemo(() => {
    const boxById = new Map(data?.boxes.map((box) => [box.id, box]) ?? []);

    return [...(data?.boxes ?? [])]
      .map((box) => ({
        box,
        path: buildBoxPath(box, boxById),
      }))
      .sort((a, b) => a.path.join(" / ").localeCompare(b.path.join(" / ")));
  }, [data?.boxes]);

  const togglePlacement = (boxId: string) => {
    placementMutation.mutate({
      action: selectedBoxIds.has(boxId) ? "remove" : "add",
      boxId,
    });
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}>
        <Package className="size-3.5" aria-hidden="true" />
        <span>Add to box</span>
      </Button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label="Add to box"
          className={cn(
            "absolute right-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-2rem))]",
            "rounded-md border bg-background p-2 shadow-lg",
          )}>
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">Placed in {selectedBoxIds.size} boxes</p>
          </div>

          <div className="mt-1 max-h-72 overflow-y-auto rounded-md border border-dashed">
            {placementsQuery.isLoading ? (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                <span>Loading boxes</span>
              </div>
            ) : null}

            {placementsQuery.isError ? (
              <div className="p-3 text-sm text-muted-foreground" role="alert">
                Boxes could not load.
              </div>
            ) : null}

            {!placementsQuery.isLoading && !placementsQuery.isError && boxes.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">No boxes yet.</div>
            ) : null}

            {boxes.map(({ box, path }) => {
              const isSelected = selectedBoxIds.has(box.id);
              const fullPath = path.join(" / ");

              return (
                <button
                  key={box.id}
                  type="button"
                  aria-label={fullPath}
                  className={cn(
                    "flex min-h-10 w-full items-center gap-2 px-2 py-2 text-left text-sm",
                    "hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  )}
                  onClick={() => togglePlacement(box.id)}>
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                      isSelected && "border-primary bg-primary text-primary-foreground",
                    )}
                    aria-hidden="true">
                    {isSelected ? <Check className="size-3" /> : null}
                  </span>
                  <BoxPathLabel path={path} />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
