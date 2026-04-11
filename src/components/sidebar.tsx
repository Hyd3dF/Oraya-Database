"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import type { ConnectionStatus } from "@/lib/shared";
import { useConnection } from "@/hooks/use-connection";
import { cn } from "@/lib/utils";

const navigation = [
  {
    href: "/dashboard",
    label: "Explorer",
    icon: DatabaseIcon,
  },
  {
    href: "/api-keys",
    label: "API Keys",
    icon: KeyIcon,
  },
  {
    href: "/docs",
    label: "Docs",
    icon: DocsIcon,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: SettingsIcon,
  },
];

function DatabaseIcon() {
  return (
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function DocsIcon() {
  return (
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h6.879a3 3 0 012.121.879l2.871 2.871A3 3 0 0120.25 9.62V18a2.25 2.25 0 01-2.25 2.25h-10.5A2.25 2.25 0 015.25 18V6A2.25 2.25 0 017.5 3.75z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.75 3.75V8.5h4.75" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.75 12.25h6.5M8.75 15.75h4.5" />
    </svg>
  );
}

function getStatusColor(status: ConnectionStatus) {
  if (status.connected) return "bg-emerald-400";
  if (status.configured) return "bg-amber-400";
  return "bg-[#6e7681]";
}

function getStatusText(status: ConnectionStatus) {
  if (status.connected) return `${status.host}/${status.database}`;
  if (status.configured) return "Connecting...";
  return "Not configured";
}

export function Sidebar({ initialStatus }: { initialStatus: ConnectionStatus }) {
  const pathname = usePathname();
  const { status } = useConnection(initialStatus);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden h-screen w-[200px] flex-col border-r border-[#21262d] bg-[#0d1117] lg:flex">
      <div className="flex h-12 items-center gap-3 border-b border-[#21262d] px-4">
        <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#21262d]">
          <Image
            src="/oroya.png"
            alt="Oroya Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold tracking-tight text-[#e5e7eb]">
            Oraya Database
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-0.5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-medium transition-all duration-150",
                  active
                    ? "bg-[#1c2128] text-[#e5e7eb] shadow-sm"
                    : "text-[#8b949e] hover:bg-[#161b22] hover:text-[#e5e7eb]",
                )}
              >
                <span className={cn("transition-colors", active ? "text-[#58a6ff]" : "text-[#6e7681]")}>
                  <Icon />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-[#21262d] p-3">
        <div className="rounded-lg bg-[#161b22] p-2.5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full shadow-sm",
                getStatusColor(status),
              )}
            />
            <span className="truncate text-[10px] text-[#8b949e]">
              {getStatusText(status)}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
