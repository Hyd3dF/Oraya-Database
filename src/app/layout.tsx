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
      <body className="font-sans">
        <div className="relative min-h-screen">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.82),transparent_42%)]" />
          <Sidebar initialStatus={connectionStatus} />
          <div className="min-h-screen lg:pl-[260px]">
            <main className="relative min-h-screen px-4 pb-10 pt-20 transition-all duration-200 ease-out sm:px-6 lg:px-10 lg:pb-14 lg:pt-10">
              {children}
            </main>
          </div>
          <Toaster position="top-right" richColors closeButton />
        </div>
      </body>
    </html>
  );
}
