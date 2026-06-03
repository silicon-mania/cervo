import Link from "next/link";
import {
  Brain,
  CalendarDays,
  CheckSquare,
  Inbox,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { Panel, PanelHeader } from "@/components/primitives/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const navItems = [
  { href: "/", label: "Main", icon: Brain },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
];

function RailLink({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <div className="group relative">
      <div>
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground">
          <Link href={href} aria-label={label}>
            <Icon className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-11 top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {label}
      </span>
    </div>
  );
}

function GlobalSearch() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        placeholder="Search"
        aria-label="Search"
        className="h-9 rounded-md bg-background pl-9 pr-16"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
        ⌘K
      </kbd>
    </div>
  );
}

function RightRail() {
  return (
    <aside className="hidden min-h-0 w-72 shrink-0 flex-col gap-3 border-l bg-muted/15 p-3 lg:flex">
      <Panel className="min-h-36">
        <PanelHeader icon={Inbox} title="Inbox" />
      </Panel>
      <Panel className="min-h-48">
        <PanelHeader icon={CalendarDays} title="Calendar" />
      </Panel>
    </aside>
  );
}

export function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <aside className="flex w-14 shrink-0 flex-col items-center border-r bg-muted/20 py-3">
        <nav className="flex flex-1 flex-col items-center gap-2">
          {navItems.map((item) => (
            <RailLink key={item.href} {...item} />
          ))}
        </nav>
        <RailLink href="/settings" label="Settings" icon={Settings} />
      </aside>
      <div className="flex min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-center px-4">
            <GlobalSearch />
          </header>
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
        <RightRail />
      </div>
    </div>
  );
}
