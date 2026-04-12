import { Plug2, ShieldCheck, Wifi } from "lucide-react";

import { ConnectionForm } from "@/components/connection-form";
import { LogoutButton } from "@/components/logout-button";
import { getConnectionConfigFromCookies, getConnectionStatus } from "@/lib/db";

const features = [
  {
    title: "Secure cookie storage",
    description: "Connection details are encrypted and stored server-side in httpOnly cookies.",
    icon: ShieldCheck,
  },
  {
    title: "Real-time sync",
    description: "Connection status is tracked across the sidebar and settings in real-time.",
    icon: Wifi,
  },
  {
    title: "Password memory",
    description: "Returning with a blank password keeps your existing secure password.",
    icon: Plug2,
  },
  {
    title: "Flexible SSL modes",
    description: "Switch between direct TCP, preferred TLS, and required TLS for different PostgreSQL providers.",
    icon: ShieldCheck,
  },
];

export default async function SettingsPage() {
  const [status, config] = await Promise.all([
    getConnectionStatus(),
    getConnectionConfigFromCookies(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Database Connection</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Connect to your PostgreSQL database.</p>
        </div>
        <LogoutButton />
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-xl shadow-black/20">
        <div className="p-6">
          <ConnectionForm
            initialStatus={status}
            initialValues={{
              host: config?.host ?? "",
              port: config?.port ?? 5432,
              user: config?.user ?? "",
              database: config?.database ?? "",
              sslMode: config?.sslMode ?? "prefer",
              allowSelfSignedCertificates: config?.allowSelfSignedCertificates ?? false,
            }}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="flex items-start gap-3 rounded-lg border border-zinc-800/40 bg-zinc-900/20 px-4 py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                <Icon className="h-4 w-4 text-zinc-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-300">{feature.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{feature.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
