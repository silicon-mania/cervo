import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Inbox, MoreHorizontal, Package, PackageOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { BoxSummary } from "../server/queries";

type BoxCardProps = {
  box: BoxSummary;
  onOpen: (box: BoxSummary) => void;
  onRename: (box: BoxSummary, name: string) => void;
  onDeleteRequest: (box: BoxSummary) => void;
};

type UnsortedBoxCardProps = {
  noteCount: number;
  onOpen: () => void;
};

function formatCount(count: number, singular: string, plural: string) {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

function formatBoxContents(box: BoxSummary) {
  if (box.directNoteCount === 0 && box.directBoxCount === 0) {
    return "empty";
  }

  return `${formatCount(box.directNoteCount, "note", "notes")} · ${formatCount(
    box.directBoxCount,
    "box",
    "boxes",
  )}`;
}

export function BoxCard({ box, onOpen, onRename, onDeleteRequest }: BoxCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(box.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const canDelete = box.slug !== "optimistic";

  useEffect(() => {
    if (!isRenaming) {
      return;
    }

    const input = inputRef.current;

    if (!input) {
      return;
    }

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [isRenaming]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMenuOpen]);

  const beginRename = () => {
    setDraftName(box.name);
    setIsMenuOpen(false);
    setIsRenaming(true);
  };

  const requestDelete = () => {
    setIsMenuOpen(false);
    onDeleteRequest(box);
  };

  const saveRename = () => {
    const nextName = draftName.trim();

    setIsRenaming(false);

    if (!nextName || nextName === box.name) {
      setDraftName(box.name);
      return;
    }

    setDraftName(nextName);
    onRename(box, nextName);
  };

  return (
    <div
      className={cn(
        "min-w-0 text-left",
        "group relative flex flex-col justify-between rounded-md border bg-background p-4",
        "transition-colors hover:border-foreground/20 hover:bg-muted/20",
      )}>
      <div className="flex items-start justify-between gap-3">
        {isRenaming ? (
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <div className="flex size-10 shrink-0 items-center justify-center">
              <PackageOpen className="size-6 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <input
                ref={inputRef}
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={saveRename}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }

                  if (event.key === "Escape") {
                    setDraftName(box.name);
                    setIsRenaming(false);
                  }
                }}
                aria-label="Rename box"
                maxLength={80}
                className={cn(
                  "h-5 w-full min-w-0 bg-transparent p-0 text-sm font-medium outline-none",
                  "border-0 shadow-none ring-0 focus-visible:outline-none",
                )}
              />
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {formatBoxContents(box)}
              </p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onOpen(box)}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-1 rounded-sm text-left",
              "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            )}>
            <div className="flex size-10 shrink-0 items-center justify-center">
              <Package className="size-6 text-muted-foreground group-hover:hidden" />
              <PackageOpen className="hidden size-6 text-foreground group-hover:block" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium" title={box.name}>
                {box.name}
              </h3>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {formatBoxContents(box)}
              </p>
            </div>
          </button>
        )}

        <div ref={menuRef} className="relative -mr-1 -mt-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Box actions"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
            className={cn(
              "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100",
              isMenuOpen && "opacity-100",
            )}>
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>

          {isMenuOpen ? (
            <div
              role="menu"
              className={cn(
                "absolute right-0 top-8 z-20 min-w-28 rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
              )}>
              <button
                type="button"
                role="menuitem"
                onClick={beginRename}
                className={cn(
                  "flex h-8 w-full items-center rounded-sm px-2 text-left text-sm",
                  "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                )}>
                Rename
              </button>
              {canDelete ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={requestDelete}
                  className={cn(
                    "flex h-8 w-full items-center rounded-sm px-2 text-left text-sm text-destructive",
                    "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                  )}>
                  Delete
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {!isRenaming ? (
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        ) : null}
      </div>
    </div>
  );
}

export function UnsortedBoxCard({ noteCount, onOpen }: UnsortedBoxCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "min-w-0 text-left",
        "group flex flex-col justify-between rounded-md border border-dashed bg-muted/30 p-4",
        "transition-colors hover:border-foreground/25 hover:bg-muted/45",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
      )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <div className="flex size-10 shrink-0 items-center justify-center">
            <Inbox className="size-6 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium">Unsorted</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCount(noteCount, "note", "notes")}
            </p>
          </div>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </button>
  );
}
