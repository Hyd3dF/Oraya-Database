"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { DatabaseZap, KeyRound, Menu, Settings2 } from "lucide-react";

import type { ConnectionStatus } from "@/lib/shared";
import { useConnection } from "@/hooks/use-connection";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navigation = [
  {
    href: "/settings",
    label: "Settings",
    description: "Database and security",
    icon: Settings2,
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Tables and schema",
    icon: DatabaseZap,
  },
  {
    href: "/api-keys",
    label: "API Keys",
    description: "Access management",
    icon: KeyRound,
  },
];

function getStatusView(status: ConnectionStatus) {
  if (status.connected) {
    return {
      dotClassName: "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]",
      title: "Connection active",
      description: `${status.host} / ${status.database}`,
    };
  }

  if (status.configured) {
    return {
      dotClassName: "bg-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.18)]",
      title: "Waiting for verification",
      description: status.error ?? status.message,
    };
  }

  return {
    dotClassName: "bg-zinc-300 shadow-[0_0_0_4px_rgba(161,161,170,0.16)]",
    title: "Waiting for connection",
    description: "Database settings have not been configured yet",
  };
}

function SidebarContent({ initialStatus }: { initialStatus: ConnectionStatus }) {
  const pathname = usePathname();
  const { status } = useConnection(initialStatus);
  const statusView = getStatusView(status);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="px-3 pb-4 pt-4">
        <div className="glass-panel flex items-start gap-3 px-4 py-3.5">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[22%] bg-white shadow-sm ring-1 ring-black/[0.04]">
            <Image
              src="/oroya.png"
              alt="Oroya Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
              PostgreSQL
            </p>
            <h1 className="text-base font-semibold text-foreground">
              Oraya Database
            </h1>
            <p className="text-[13px] leading-5 text-muted-foreground">
              Precise desktop control center
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3">
        <nav className="space-y-1.5 pb-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "nav-pill flex items-center gap-3 border-white/70 bg-white/56 px-3.5 py-3 hover:-translate-y-0.5 hover:border-white/90 hover:bg-white/82 hover:shadow-soft",
                  active &&
                    "border-primary/15 bg-primary/[0.08] text-primary shadow-soft",
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-[15px] bg-background/80 text-muted-foreground transition-all duration-200 ease-out",
                    active && "bg-primary text-primary-foreground",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "block truncate text-[11px] text-muted-foreground",
                      active && "text-primary/80",
                    )}
                  >
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="px-3 pb-3 pt-4">
        <Separator className="mb-3 bg-white/80" />
        <div className="surface-panel px-4 py-3.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Connection Status
          </p>
          <div className="mt-2.5 flex items-center gap-3">
            <span className={`status-dot ${statusView.dotClassName}`} />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground">
                {statusView.title}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {statusView.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ initialStatus }: { initialStatus: ConnectionStatus }) {
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 border-b border-white/70 bg-white/62 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[22%] bg-white shadow-sm ring-1 ring-black/[0.04]">
              <Image
                src="/oroya.png"
                alt="Oroya Logo"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Oraya Database
              </p>
              <p className="text-sm font-semibold text-foreground">
                PostgreSQL control center
              </p>
            </div>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-2xl border-white/80 bg-white/80 shadow-soft"
              >
                <Menu className="h-4 w-4" />
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="h-screen w-[280px] overflow-hidden border-white/80 bg-white/86 p-0 backdrop-blur-xl"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
              <SidebarContent initialStatus={initialStatus} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden h-screen w-[260px] overflow-hidden border-r border-white/60 bg-white/36 backdrop-blur-2xl lg:block">
        <SidebarContent initialStatus={initialStatus} />
      </aside>
    </>
  );
}
