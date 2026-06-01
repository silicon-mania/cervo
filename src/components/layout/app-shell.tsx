import Link from "next/link";
import {
  Archive,
  Boxes,
  Calendar,
  CheckSquare,
  Inbox,
  Search,
  Settings,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/today", label: "Today", icon: Calendar },
  { href: "/boxes", label: "Boxes", icon: Boxes },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
];

export function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <aside className="flex w-64 shrink-0 flex-col border-r bg-muted/25">
        <div className="flex h-14 items-center px-4">
          <Link href="/today" className="text-sm font-semibold tracking-normal">
            Cervo
          </Link>
        </div>
        <div className="px-3">
          <Button
            variant="outline"
            className="h-9 w-full justify-start gap-2 text-muted-foreground"
          >
            <Search className="size-4" aria-hidden="true" />
            Search
          </Button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              className="justify-start gap-2"
            >
              <Link href={item.href}>
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            </Button>
          ))}
          <Separator className="my-2" />
          <Button
            variant="ghost"
            className="justify-start gap-2 text-muted-foreground"
          >
            <Inbox className="size-4" aria-hidden="true" />
            Inbox
          </Button>
          <Button
            variant="ghost"
            className="justify-start gap-2 text-muted-foreground"
          >
            <Archive className="size-4" aria-hidden="true" />
            Archive
          </Button>
        </nav>
        <div className="space-y-3 border-t p-3">
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <Link href="/settings">
              <Settings className="size-4" aria-hidden="true" />
              Settings
            </Link>
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
