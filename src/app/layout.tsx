import type { Metadata } from "next";
import "@fontsource/inter/index.css";

import "./globals.css";

import { AuthLayoutWrapper } from "@/components/auth-layout-wrapper";
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
          <AuthLayoutWrapper initialStatus={connectionStatus}>
            {children}
          </AuthLayoutWrapper>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
