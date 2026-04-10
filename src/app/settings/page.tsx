import Image from "next/image";
import { ShieldCheck, Sparkles, Wifi } from "lucide-react";

import { ConnectionForm } from "@/components/connection-form";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConnectionConfigFromCookies, getConnectionStatus } from "@/lib/db";

const highlights = [
  {
    title: "Encrypted cookie layer",
    description:
      "Connection details are stored server-side using AES-GCM encryption.",
    icon: ShieldCheck,
  },
  {
    title: "Live status tracking",
    description:
      "The sidebar and settings screen track the same connection status in real-time.",
    icon: Wifi,
  },
  {
    title: "Fast reconnection",
    description:
      "If you leave the password field blank when returning to the same target, the existing secure password is kept.",
    icon: Sparkles,
  },
];

export default async function SettingsPage() {
  const [status, config] = await Promise.all([
    getConnectionStatus(),
    getConnectionConfigFromCookies(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-5">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[22%] bg-white shadow-sm ring-1 ring-black/[0.04]">
          <Image
            src="/oroya.png"
            alt="Oroya Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
        <PageHeader
          eyebrow="Connection Management"
          title="Manage your PostgreSQL connection in real-time"
          description="The placeholder layer has been removed. This screen now establishes a real connection via secure cookies, verifies the status, and syncs with the sidebar."
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="surface-panel border-white/80">
          <CardHeader className="space-y-3">
            <Badge className="w-fit rounded-full bg-primary/10 px-3 py-1 text-primary hover:bg-primary/10">
              Active form
            </Badge>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Database connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConnectionForm
              initialStatus={status}
              initialValues={{
                host: config?.host ?? "",
                port: config?.port ?? 5432,
                user: config?.user ?? "",
                database: config?.database ?? "",
              }}
            />
          </CardContent>
        </Card>

        <div className="grid gap-5">
          {highlights.map((item) => {
            const Icon = item.icon;

            return (
              <Card key={item.title} className="glass-panel border-white/80">
                <CardContent className="flex gap-4 p-6">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
