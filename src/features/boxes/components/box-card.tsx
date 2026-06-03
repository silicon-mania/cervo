import { ArrowUpRight, Inbox, Package, PackageOpen } from "lucide-react";

import { cn } from "@/lib/utils";

import type { BoxSummary } from "../server/queries";

type BoxCardProps = {
  box: BoxSummary;
  onOpen: (box: BoxSummary) => void;
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

export function BoxCard({ box, onOpen }: BoxCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(box)}
      className={cn(
        "min-w-0 text-left",
        "group flex flex-col justify-between rounded-md border bg-background p-4",
        "transition-colors hover:border-foreground/20 hover:bg-muted/20",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
      )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <div className="flex size-10 shrink-0 items-center justify-center">
            <Package className="size-6 text-muted-foreground group-hover:hidden" />
            <PackageOpen className="hidden size-6 text-foreground group-hover:block" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium" title={box.name}>
              {box.name}
            </h3>
            <p className="mt-1 truncate text-xs text-muted-foreground">{formatBoxContents(box)}</p>
          </div>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </button>
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
