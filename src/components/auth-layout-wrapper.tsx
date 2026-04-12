"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import type { ConnectionStatus } from "@/lib/shared";

export function AuthLayoutWrapper({ 
  children, 
  initialStatus 
}: { 
  children: React.ReactNode;
  initialStatus: ConnectionStatus;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isAuthPage) {
    return (
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    );
  }

  return (
    <>
      <Sidebar initialStatus={initialStatus} />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden lg:pl-[200px]">
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </>
  );
}
