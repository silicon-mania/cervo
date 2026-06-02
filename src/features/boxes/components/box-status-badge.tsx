import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BoxStatusBadgeProps = {
  status: "active" | "future" | "archived";
};

const statusLabels: Record<BoxStatusBadgeProps["status"], string> = {
  active: "Active",
  future: "Future",
  archived: "Archived",
};

export function BoxStatusBadge({ status }: BoxStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize text-muted-foreground",
        status === "active" && "border-emerald-200 text-emerald-700",
        status === "future" && "border-blue-200 text-blue-700",
        status === "archived" && "border-border text-muted-foreground",
      )}
    >
      {statusLabels[status]}
    </Badge>
  );
}
