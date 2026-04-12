import type { Metadata } from "next";
import "@fontsource/inter/index.css";

import "./globals.css";

import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { getConnectionStatus } from "@/lib/db";

export const runtime = "nodejs";

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
      <body className="h-screen overflow-hidden bg-[#0f1117] font-sans antialiased">
        <div className="flex h-full overflow-hidden">
          <Sidebar initialStatus={connectionStatus} />
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden lg:pl-[200px]">
            <div className="flex-1 overflow-hidden">
              {children}
            </div>
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
