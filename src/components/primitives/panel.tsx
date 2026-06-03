import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function Panel({
  className,
  children,
}: Readonly<{
  className?: string;
  children: React.ReactNode;
}>) {
  return (
    <section className={cn("rounded-md border bg-background p-4", className)}>{children}</section>
  );
}

export function PanelHeader({
  icon: Icon,
  title,
}: Readonly<{
  icon?: LucideIcon;
  title: string;
}>) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {Icon ? <Icon className="size-4 text-muted-foreground" aria-hidden="true" /> : null}
      <h2 className="text-sm font-medium">{title}</h2>
    </div>
  );
}
