"use client";

import { type FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { BoxMemoryData, BoxSummary, RootMemoryData } from "@/features/boxes/server/queries";

type CreateBoxFormProps = {
  parentBoxId?: string;
  placeholder?: string;
  buttonLabel?: string;
  onCreated?: (box: BoxSummary) => void;
  onCreateFailed?: (boxId: string, parentBoxId: string | null) => void;
};

type CreateBoxRequest = {
  id: string;
  name: string;
  parentBoxId: string | null;
};

type CreateBoxErrorResponse = {
  error: string;
};

type OptimisticContext = {
  optimisticBoxId: string;
  parentBoxId: string | null;
};

const rootMemoryQueryKey = ["memory", "root"] as const;

function boxMemoryQueryKey(boxId: string) {
  return ["memory", "box", boxId] as const;
}

function sortBoxes(boxes: BoxSummary[]) {
  return [...boxes].sort((a, b) => a.name.localeCompare(b.name));
}

async function createBoxRequest(input: CreateBoxRequest) {
  const response = await fetch("/api/boxes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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

function insertBox(boxes: BoxSummary[], box: BoxSummary) {
  const withoutDuplicate = boxes.filter((currentBox) => currentBox.id !== box.id);

  return sortBoxes([...withoutDuplicate, box]);
}

function removeBox(boxes: BoxSummary[], boxId: string) {
  return boxes.filter((currentBox) => currentBox.id !== boxId);
}

export function CreateBoxForm({
  parentBoxId,
  placeholder = "Box name",
  buttonLabel = "New Box",
  onCreated,
  onCreateFailed,
}: CreateBoxFormProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const createBoxMutation = useMutation<BoxSummary, Error, CreateBoxRequest, OptimisticContext>({
    mutationFn: createBoxRequest,
    onMutate: async (input) => {
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

      if (!input.parentBoxId) {
        await queryClient.cancelQueries({ queryKey: rootMemoryQueryKey });
        queryClient.setQueryData<RootMemoryData>(rootMemoryQueryKey, (currentData) => {
          if (!currentData) {
            return currentData;
          }

          return {
            ...currentData,
            boxes: insertBox(currentData.boxes, optimisticBox),
          };
        });
      } else {
        const queryKey = boxMemoryQueryKey(input.parentBoxId);

        await queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData<BoxMemoryData>(queryKey, (currentData) => {
          if (!currentData) {
            return currentData;
          }

          return {
            ...currentData,
            childBoxes: insertBox(currentData.childBoxes, optimisticBox),
          };
        });
      }

      return {
        optimisticBoxId: optimisticBox.id,
        parentBoxId: input.parentBoxId,
      };
    },
    onSuccess: (box, _input, context) => {
      if (!context.parentBoxId) {
        queryClient.setQueryData<RootMemoryData>(rootMemoryQueryKey, (currentData) => {
          if (!currentData) {
            return currentData;
          }

          return {
            ...currentData,
            boxes: sortBoxes(
              currentData.boxes.map((currentBox) =>
                currentBox.id === context.optimisticBoxId ? box : currentBox,
              ),
            ),
          };
        });
        void queryClient.invalidateQueries({ queryKey: ["memory"] });
        onCreated?.(box);
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
            childBoxes: sortBoxes(
              currentData.childBoxes.map((currentBox) =>
                currentBox.id === context.optimisticBoxId ? box : currentBox,
              ),
            ),
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: ["memory"] });
      onCreated?.(box);
    },
    onError: (error, _input, context) => {
      if (!context) {
        toast.error(error.message);
        return;
      }

      if (!context.parentBoxId) {
        queryClient.setQueryData<RootMemoryData>(rootMemoryQueryKey, (currentData) => {
          if (!currentData) {
            return currentData;
          }

          return {
            ...currentData,
            boxes: removeBox(currentData.boxes, context.optimisticBoxId),
          };
        });
      } else {
        queryClient.setQueryData<BoxMemoryData>(
          boxMemoryQueryKey(context.parentBoxId),
          (currentData) => {
            if (!currentData) {
              return currentData;
            }

            return {
              ...currentData,
              childBoxes: removeBox(currentData.childBoxes, context.optimisticBoxId),
            };
          },
        );
      }

      toast.error(error.message);
      onCreateFailed?.(context.optimisticBoxId, context.parentBoxId);
    },
  });

  const isPending = createBoxMutation.isPending;
  const trimmedName = name.trim();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isPending || trimmedName.length === 0) {
      return;
    }

    const submittedName = trimmedName;
    const submittedParentBoxId = parentBoxId ?? null;
    const submittedId = globalThis.crypto.randomUUID();

    setName("");
    createBoxMutation.mutate({
      id: submittedId,
      name: submittedName,
      parentBoxId: submittedParentBoxId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-w-0 items-center gap-2">
      <Input
        name="name"
        required
        maxLength={80}
        placeholder={placeholder}
        aria-label={placeholder}
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="h-9 min-w-0 bg-background"
      />
      <Button
        type="submit"
        variant="outline"
        className="shrink-0"
        disabled={isPending || trimmedName.length === 0}>
        {isPending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Plus className="size-4" aria-hidden="true" />
        )}
        {buttonLabel}
      </Button>
    </form>
  );
}
