import type { Metadata } from "next";
import "@fontsource/inter/index.css";

import "./globals.css";

import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { getConnectionStatus } from "@/lib/db";

export const metadata: Metadata = {
  title: "Oraya Database",
  description: "Premium PostgreSQL Management Engine & Data Governance",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const connectionStatus = await getConnectionStatus();

  return (
    <html lang="en">
      <body className="h-screen overflow-hidden font-sans">
        <div className="relative flex h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.82),transparent_42%)]" />
          <Sidebar initialStatus={connectionStatus} />
          <div className="relative flex min-w-0 flex-1 overflow-hidden lg:pl-[260px]">
            <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden pt-16 lg:pt-0">
              <div className="app-scroll-pane flex-1 overflow-y-auto px-4 py-4 transition-all duration-200 ease-out sm:px-6 lg:px-8 lg:py-6">
                {children}
              </div>
            </main>
          </div>
          <Toaster position="top-right" richColors closeButton />
        </div>
      </body>
    </html>
  );
}
