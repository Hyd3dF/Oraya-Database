import { ShieldCheck, Sparkles, Wifi } from "lucide-react";

import { ConnectionForm } from "@/components/connection-form";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConnectionConfigFromCookies, getConnectionStatus } from "@/lib/db";

const highlights = [
  {
    title: "Şifreli çerez katmanı",
    description:
      "Bağlantı bilgileri sunucu tarafında AES-GCM ile şifrelenerek saklanır.",
    icon: ShieldCheck,
  },
  {
    title: "Canlı durum takibi",
    description:
      "Sidebar ve ayarlar ekranı aynı bağlantı durumunu eşzamanlı izler.",
    icon: Wifi,
  },
  {
    title: "Hızlı yeniden bağlanma",
    description:
      "Aynı hedefe dönerken şifre alanını boş bırakırsanız mevcut güvenli parola korunur.",
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
      <PageHeader
        eyebrow="Bağlantı Yönetimi"
        title="PostgreSQL bağlantısını gerçek zamanlı yönetin"
        description="Placeholder katmanı kaldırıldı. Bu ekran artık güvenli çerez üstünden gerçek bağlantı kurar, durumu doğrular ve sidebar ile senkron çalışır."
      />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="surface-panel border-white/80">
          <CardHeader className="space-y-3">
            <Badge className="w-fit rounded-full bg-primary/10 px-3 py-1 text-primary hover:bg-primary/10">
              Aktif form
            </Badge>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Veritabanı bağlantısı
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
