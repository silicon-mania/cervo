import Link from "next/link";
import { ArrowUpRight, Inbox, Package, PackageOpen } from "lucide-react";

import { cn } from "@/lib/utils";

import { BoxStatusBadge } from "./box-status-badge";
import type { BoxSummary } from "../server/queries";

type BoxCardProps = {
  box: BoxSummary;
};

type UnsortedBoxCardProps = {
  noteCount: number;
};

export function BoxCard({ box }: BoxCardProps) {
  return (
    <Link
      href={`/boxes/${box.id}`}
      className={cn(
        "group flex min-h-36 flex-col justify-between rounded-md border bg-background p-4",
        "transition-colors hover:border-foreground/20 hover:bg-muted/20",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md border bg-muted/30">
            <Package className="size-5 text-muted-foreground group-hover:hidden" />
            <PackageOpen className="hidden size-5 text-foreground group-hover:block" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium">{box.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">Box home</p>
          </div>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <BoxStatusBadge status={box.status} />
      </div>
    </Link>
  );
}

export function UnsortedBoxCard({ noteCount }: UnsortedBoxCardProps) {
  return (
    <Link
      href="/boxes/unsorted"
      className={cn(
        "group flex min-h-36 flex-col justify-between rounded-md border border-dashed bg-muted/30 p-4",
        "transition-colors hover:border-foreground/25 hover:bg-muted/45",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md border border-dashed bg-background">
            <Inbox className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium">Unsorted</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {noteCount === 1 ? "1 note" : `${noteCount} notes`}
            </p>
          </div>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="text-xs text-muted-foreground">Notes without boxes</p>
    </Link>
  );
}
