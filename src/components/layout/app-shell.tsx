"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Brain,
  CalendarDays,
  CheckSquare,
  FilePenLine,
  Inbox,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { Panel, PanelHeader } from "@/components/primitives/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type HeaderCreateNoteAction = {
  onCreate: () => void;
  disabled?: boolean;
};

type AppShellContextValue = {
  setHeaderCreateNoteAction: (action: HeaderCreateNoteAction | null) => void;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

const navItems = [
  { href: "/", label: "Main", icon: Brain },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
];

export function useAppShellHeaderCreateNoteAction() {
  const context = useContext(AppShellContext);

  if (!context) {
    throw new Error("useAppShellHeaderCreateNoteAction must be used within AppShell.");
  }

  return context.setHeaderCreateNoteAction;
}

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

function HeaderIconButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  pressed,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className="h-9 w-9 rounded-md border-0 bg-transparent text-muted-foreground shadow-none hover:bg-muted/60 hover:text-foreground">
      <Icon className="size-4" aria-hidden="true" />
    </Button>
  );
}

function HeaderCreateNoteButton({ action }: { action: HeaderCreateNoteAction | null }) {
  if (!action) {
    return null;
  }

  return (
    <HeaderIconButton
      label="Create note"
      icon={FilePenLine}
      disabled={action.disabled}
      onClick={action.onCreate}
    />
  );
}

function GlobalSearch({ createNoteAction }: { createNoteAction: HeaderCreateNoteAction | null }) {
  return (
    <div className="flex w-full max-w-xl items-center justify-center gap-2">
      <div className="relative w-full max-w-lg">
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
      <HeaderCreateNoteButton action={createNoteAction} />
    </div>
  );
}

function RightRail({ isOpen }: { isOpen: boolean }) {
  return (
    <aside
      aria-hidden={!isOpen}
      className={cn(
        "min-h-0 shrink-0 overflow-hidden bg-muted/15 transition-[width,opacity,border-color] duration-200 ease-out",
        isOpen ? "w-72 border-l opacity-100" : "w-0 border-l-0 opacity-0",
      )}>
      <div
        className={cn(
          "flex w-72 flex-col gap-3 p-3 transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "translate-x-4",
        )}>
        <Panel className="min-h-36">
          <PanelHeader icon={Inbox} title="Inbox" />
        </Panel>
        <Panel className="min-h-48">
          <PanelHeader icon={CalendarDays} title="Calendar" />
        </Panel>
      </div>
    </aside>
  );
}

export function AppShell({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [headerCreateNoteAction, setHeaderCreateNoteAction] =
    useState<HeaderCreateNoteAction | null>(null);
  const [isRightRailOpen, setIsRightRailOpen] = useState(true);
  const contextValue = useMemo<AppShellContextValue>(
    () => ({ setHeaderCreateNoteAction }),
    [],
  );
  const toggleRightRail = () => {
    setIsRightRailOpen((currentValue) => !currentValue);
  };

  return (
    <AppShellContext.Provider value={contextValue}>
      <div className="flex min-h-svh bg-background text-foreground">
        <aside className="flex w-14 shrink-0 flex-col items-center border-r bg-muted/20 py-3">
          <nav className="flex flex-1 flex-col items-center gap-2">
            {navItems.map((item) => (
              <RailLink key={item.href} {...item} />
            ))}
          </nav>
          <RailLink href="/settings" label="Settings" icon={Settings} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4">
            <div className="col-start-2 flex min-w-0 justify-center">
              <GlobalSearch createNoteAction={headerCreateNoteAction} />
            </div>
            <div className="col-start-3 flex justify-end">
              <HeaderIconButton
                label={isRightRailOpen ? "Hide side panel" : "Show side panel"}
                icon={isRightRailOpen ? PanelRightClose : PanelRightOpen}
                pressed={isRightRailOpen}
                onClick={toggleRightRail}
              />
            </div>
          </header>
          <div className="flex min-h-0 flex-1">
            <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
            <RightRail isOpen={isRightRailOpen} />
          </div>
        </div>
      </div>
    </AppShellContext.Provider>
  );
}
