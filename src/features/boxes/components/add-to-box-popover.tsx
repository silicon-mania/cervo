"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, LoaderCircle, Package, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type CreateBoxRequest = {
  id: string;
  name: string;
  parentBoxId: string | null;
};

type CreateBoxErrorResponse = {
  error: string;
};

type CreateAndPlaceBoxResponse = {
  box: BoxSummary;
  document: BoxDocumentSummary;
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

type CreateAndPlaceBoxContext = {
  optimisticBox: BoxSummary;
  parentBoxId: string | null;
  previousPlacementData?: DocumentBoxPlacementsData;
  previousRootMemory?: RootMemoryData;
  previousParentBoxMemory?: BoxMemoryData;
  wasFirstPlacement: boolean;
};

const rootMemoryQueryKey = ["memory", "root"] as const;

function boxMemoryQueryKey(boxId: string) {
  return ["memory", "box", boxId] as const;
}

function documentBoxPlacementsQueryKey(documentId: string) {
  return ["documents", documentId, "box-placements"] as const;
}

async function fetchDocumentBoxPlacements(documentId: string) {
  const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/box-placements`);
  const payload = (await response.json().catch(() => null)) as {
    data?: DocumentBoxPlacementsData;
    error?: string;
  } | null;

  if (!response.ok || !payload?.data) {
    throw new Error(payload?.error ?? "Unable to load box placements.");
  }

  return payload.data;
}

async function mutatePlacement(documentId: string, input: PlacementMutationInput) {
  const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/box-placements`, {
    method: input.action === "add" ? "POST" : "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boxId: input.boxId }),
  });
  const payload = (await response.json().catch(() => null)) as PlacementMutationResponse | null;

  if (!response.ok || !payload || payload.error) {
    throw new Error(payload?.error ?? "Unable to update box placement.");
  }

  return payload;
}

async function createBoxRequest(input: CreateBoxRequest) {
  const response = await fetch("/api/boxes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => null)) as
    | BoxSummary
    | CreateBoxErrorResponse
    | null;

  if (!response.ok || !payload || "error" in payload) {
    const errorMessage = payload && "error" in payload ? payload.error : "Unable to create box.";

    throw new Error(errorMessage);
  }

  return payload;
}

async function createAndPlaceBox(documentId: string, input: CreateBoxRequest) {
  const box = await createBoxRequest(input);
  const placement = await mutatePlacement(documentId, {
    action: "add",
    boxId: box.id,
  });

  return {
    box: placement.box,
    document: placement.document,
  };
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

function replaceBox(boxes: BoxSummary[], optimisticBoxId: string, box: BoxSummary) {
  return insertBox(removeBox(boxes, optimisticBoxId), box);
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
  const [newBoxName, setNewBoxName] = useState("");
  const [newBoxParentId, setNewBoxParentId] = useState<string | null>(null);
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

      const previousPlacementData = queryClient.getQueryData<DocumentBoxPlacementsData>(queryKey);
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

      void queryClient.invalidateQueries({ queryKey: ["memory"] });
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

  const createAndPlaceBoxMutation = useMutation<
    CreateAndPlaceBoxResponse,
    Error,
    CreateBoxRequest,
    CreateAndPlaceBoxContext
  >({
    scope: { id: `document-box-placements:${documentId}` },
    mutationFn: (input) => createAndPlaceBox(documentId, input),
    onMutate: async (input) => {
      const parentBoxQueryKey = input.parentBoxId ? boxMemoryQueryKey(input.parentBoxId) : null;

      await Promise.all([
        queryClient.cancelQueries({ queryKey }),
        queryClient.cancelQueries({ queryKey: rootMemoryQueryKey }),
        ...(parentBoxQueryKey ? [queryClient.cancelQueries({ queryKey: parentBoxQueryKey })] : []),
      ]);

      const previousPlacementData = queryClient.getQueryData<DocumentBoxPlacementsData>(queryKey);
      const previousRootMemory = queryClient.getQueryData<RootMemoryData>(rootMemoryQueryKey);
      const previousParentBoxMemory = parentBoxQueryKey
        ? queryClient.getQueryData<BoxMemoryData>(parentBoxQueryKey)
        : undefined;
      const wasFirstPlacement = Boolean(previousPlacementData?.placements.length === 0);
      const optimisticBox: BoxSummary = {
        id: input.id,
        name: input.name,
        slug: "optimistic",
        status: "active",
        parentBoxId: input.parentBoxId,
        homeDocumentId: null,
        directNoteCount: 0,
        directBoxCount: 0,
      };

      queryClient.setQueryData<DocumentBoxPlacementsData>(queryKey, (currentData) => {
        if (!currentData) {
          return currentData;
        }

        return {
          ...currentData,
          boxes: insertBox(currentData.boxes, optimisticBox),
          placements: insertBox(currentData.placements, optimisticBox),
        };
      });

      if (!input.parentBoxId) {
        queryClient.setQueryData<RootMemoryData>(rootMemoryQueryKey, (currentData) => {
          if (!currentData) {
            return currentData;
          }

          return {
            ...currentData,
            boxes: insertBox(currentData.boxes, optimisticBox),
            unsortedDocuments:
              wasFirstPlacement && previousPlacementData?.document
                ? removeDocument(currentData.unsortedDocuments, previousPlacementData.document.id)
                : currentData.unsortedDocuments,
          };
        });
      }

      if (input.parentBoxId && parentBoxQueryKey) {
        queryClient.setQueryData<BoxMemoryData>(parentBoxQueryKey, (currentData) => {
          if (!currentData) {
            return currentData;
          }

          return {
            ...currentData,
            childBoxes: insertBox(currentData.childBoxes, optimisticBox),
          };
        });
      }

      if (input.parentBoxId && wasFirstPlacement && previousPlacementData?.document) {
        queryClient.setQueryData<RootMemoryData>(rootMemoryQueryKey, (currentData) => {
          if (!currentData) {
            return currentData;
          }

          return {
            ...currentData,
            unsortedDocuments: removeDocument(
              currentData.unsortedDocuments,
              previousPlacementData.document.id,
            ),
          };
        });
      }

      return {
        optimisticBox,
        parentBoxId: input.parentBoxId,
        previousPlacementData,
        previousRootMemory,
        previousParentBoxMemory,
        wasFirstPlacement,
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
          boxes: replaceBox(currentData.boxes, context.optimisticBox.id, placement.box),
          placements: replaceBox(currentData.placements, context.optimisticBox.id, placement.box),
        };
      });

      if (!context.parentBoxId) {
        queryClient.setQueryData<RootMemoryData>(rootMemoryQueryKey, (currentData) => {
          if (!currentData) {
            return currentData;
          }

          return {
            ...currentData,
            boxes: replaceBox(currentData.boxes, context.optimisticBox.id, placement.box),
            unsortedDocuments: context.wasFirstPlacement
              ? removeDocument(currentData.unsortedDocuments, placement.document.id)
              : currentData.unsortedDocuments,
          };
        });
        void queryClient.invalidateQueries({ queryKey: ["memory"] });
        return;
      }

      queryClient.setQueryData<BoxMemoryData>(
        boxMemoryQueryKey(context.parentBoxId),
        (currentData) => {
          if (!currentData) {
            return currentData;
          }

          return {
            ...currentData,
            childBoxes: replaceBox(currentData.childBoxes, context.optimisticBox.id, placement.box),
          };
        },
      );

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

      void queryClient.invalidateQueries({ queryKey: ["memory"] });
    },
    onError: (error, _input, context) => {
      if (context?.previousPlacementData) {
        queryClient.setQueryData(queryKey, context.previousPlacementData);
      }

      if (context?.previousRootMemory) {
        queryClient.setQueryData(rootMemoryQueryKey, context.previousRootMemory);
      }

      if (context?.previousParentBoxMemory && context.parentBoxId) {
        queryClient.setQueryData(
          boxMemoryQueryKey(context.parentBoxId),
          context.previousParentBoxMemory,
        );
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
  const validNewBoxParentId =
    newBoxParentId && data?.boxes.some((box) => box.id === newBoxParentId) ? newBoxParentId : null;
  const selectedParentPath = useMemo(() => {
    const selectedParent = validNewBoxParentId
      ? boxes.find(({ box }) => box.id === validNewBoxParentId)
      : null;

    return selectedParent?.path ?? null;
  }, [boxes, validNewBoxParentId]);

  const togglePlacement = (boxId: string) => {
    placementMutation.mutate({
      action: selectedBoxIds.has(boxId) ? "remove" : "add",
      boxId,
    });
  };
  const trimmedNewBoxName = newBoxName.trim();
  const canCreateBox =
    trimmedNewBoxName.length > 0 &&
    !placementsQuery.isLoading &&
    !placementsQuery.isError &&
    !createAndPlaceBoxMutation.isPending;

  const handleCreateBox = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canCreateBox) {
      return;
    }

    const submittedName = trimmedNewBoxName;
    const submittedParentBoxId = validNewBoxParentId;
    const submittedId = globalThis.crypto.randomUUID();

    setNewBoxName("");
    createAndPlaceBoxMutation.mutate({
      id: submittedId,
      name: submittedName,
      parentBoxId: submittedParentBoxId,
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

          <form onSubmit={handleCreateBox} className="space-y-2 border-y px-2 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <Input
                name="new-box-name"
                required
                maxLength={80}
                placeholder="New box"
                aria-label="New box name"
                value={newBoxName}
                onChange={(event) => setNewBoxName(event.target.value)}
                className="h-8 min-w-0 bg-background"
              />
              <Button
                type="submit"
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                disabled={!canCreateBox}
                aria-label="Create box">
                {createAndPlaceBoxMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="size-4" aria-hidden="true" />
                )}
              </Button>
            </div>

            <div className="flex min-w-0 items-center gap-2 text-xs">
              <span className="shrink-0 font-medium text-muted-foreground">Parent</span>
              <button
                type="button"
                className={cn(
                  "rounded-sm px-1.5 py-1 font-medium hover:bg-muted",
                  !validNewBoxParentId && "bg-muted text-foreground",
                )}
                onClick={() => setNewBoxParentId(null)}>
                Root
              </button>
              {selectedParentPath ? <BoxPathLabel path={selectedParentPath} /> : null}
            </div>

            {boxes.length > 0 ? (
              <div className="flex max-h-16 flex-wrap gap-1 overflow-y-auto">
                {boxes.map(({ box, path }) => {
                  const isParent = validNewBoxParentId === box.id;

                  return (
                    <button
                      key={`parent-${box.id}`}
                      type="button"
                      aria-label={`Parent ${path.join(" / ")}`}
                      className={cn(
                        "rounded-sm border px-1 py-0.5 text-xs hover:bg-muted",
                        isParent && "border-primary bg-primary/10",
                      )}
                      onClick={() => setNewBoxParentId(box.id)}>
                      <BoxPathLabel path={path} />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </form>

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
