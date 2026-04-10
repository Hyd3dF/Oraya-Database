"use client";

import Link from "next/link";
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
    label: "Ayarlar",
    description: "Bağlantı ve güvenlik",
    icon: Settings2,
  },
  {
    href: "/dashboard",
    label: "Panel",
    description: "Tablolar ve şema",
    icon: DatabaseZap,
  },
  {
    href: "/api-keys",
    label: "API Anahtarları",
    description: "Erişim yönetimi",
    icon: KeyRound,
  },
];

function getStatusView(status: ConnectionStatus) {
  if (status.connected) {
    return {
      dotClassName: "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]",
      title: "Bağlantı aktif",
      description: `${status.host} / ${status.database}`,
    };
  }

  if (status.configured) {
    return {
      dotClassName: "bg-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.18)]",
      title: "Doğrulama bekliyor",
      description: status.error ?? status.message,
    };
  }

  return {
    dotClassName: "bg-zinc-300 shadow-[0_0_0_4px_rgba(161,161,170,0.16)]",
    title: "Bağlantı bekleniyor",
    description: "Veritabanı ayarları henüz yapılandırılmadı",
  };
}

function SidebarContent({ initialStatus }: { initialStatus: ConnectionStatus }) {
  const pathname = usePathname();
  const { status } = useConnection(initialStatus);
  const statusView = getStatusView(status);

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pb-6 pt-5">
        <div className="glass-panel flex items-start gap-4 px-4 py-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <DatabaseZap className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
              PostgreSQL
            </p>
            <h1 className="text-lg font-semibold text-foreground">
              Yönetim Paneli
            </h1>
            <p className="text-sm text-muted-foreground">
              Minimal, hızlı ve güvenli kontrol merkezi
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "nav-pill flex items-center gap-3 border-white/70 bg-white/52 hover:-translate-y-0.5 hover:border-white/90 hover:bg-white/80 hover:shadow-soft",
                  active &&
                    "border-primary/15 bg-primary/[0.08] text-primary shadow-soft",
                )}
              >
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-2xl bg-background/80 text-muted-foreground transition-all duration-200 ease-out",
                    active && "bg-primary text-primary-foreground",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "block truncate text-xs text-muted-foreground",
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

      <div className="px-3 pb-4 pt-6">
        <Separator className="mb-4 bg-white/80" />
        <div className="surface-panel px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Bağlantı Durumu
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className={`status-dot ${statusView.dotClassName}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {statusView.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
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
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Yönetim Paneli
            </p>
            <p className="text-sm font-semibold text-foreground">
              PostgreSQL kontrol merkezi
            </p>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-2xl border-white/80 bg-white/80 shadow-soft"
              >
                <Menu className="h-4 w-4" />
                <span className="sr-only">Navigasyonu aç</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[280px] border-white/80 bg-white/86 p-0 backdrop-blur-xl"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Gezinme Menüsü</SheetTitle>
              </SheetHeader>
              <SidebarContent initialStatus={initialStatus} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] border-r border-white/60 bg-white/36 backdrop-blur-2xl lg:block">
        <SidebarContent initialStatus={initialStatus} />
      </aside>
    </>
  );
}
