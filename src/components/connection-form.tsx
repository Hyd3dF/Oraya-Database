"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, Plug2, RotateCcw, ShieldCheck, Unplug } from "lucide-react";
import { toast } from "sonner";

import type { ConnectionInput, ConnectionStatus } from "@/lib/shared";
import { dispatchConnectionStatusChanged, useConnection } from "@/hooks/use-connection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConnectionFormProps {
  initialStatus: ConnectionStatus;
  initialValues: Pick<ConnectionInput, "host" | "port" | "user" | "database">;
}

interface ConnectionFormState {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

function getStatusTone(status: ConnectionStatus) {
  if (status.connected) {
    return {
      dotClassName: "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]",
      title: "Bağlantı aktif",
      description: `${status.database} veritabanına bağlı.`,
    };
  }

  if (status.configured) {
    return {
      dotClassName: "bg-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.18)]",
      title: "Bağlantı doğrulanamadı",
      description: status.error ?? status.message,
    };
  }

  return {
    dotClassName: "bg-zinc-300 shadow-[0_0_0_4px_rgba(161,161,170,0.16)]",
    title: "Bağlantı bekleniyor",
    description: "Bağlantı bilgilerini girip veritabanına bağlanın.",
  };
}

export function ConnectionForm({
  initialStatus,
  initialValues,
}: ConnectionFormProps) {
  const router = useRouter();
  const { status, isRefreshing, refresh } = useConnection(initialStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<ConnectionFormState>({
    host: initialValues.host,
    port: String(initialValues.port),
    user: initialValues.user,
    password: "",
    database: initialValues.database,
  });

  const statusTone = getStatusTone(status);
  const hasStoredConnection =
    Boolean(initialValues.host) &&
    Boolean(initialValues.user) &&
    Boolean(initialValues.database);

  function updateField<K extends keyof ConnectionFormState>(
    key: K,
    value: ConnectionFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleConnect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          host: form.host,
          port: Number(form.port),
          user: form.user,
          password: form.password,
          database: form.database,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Bağlantı kurulamadı.");
      }

      dispatchConnectionStatusChanged();
      toast.success("Veritabanı bağlantısı kuruldu.");
      setForm((current) => ({
        ...current,
        password: "",
      }));
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Bağlantı kurulurken hata oluştu.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDisconnect() {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/connect", {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Bağlantı sonlandırılamadı.");
      }

      dispatchConnectionStatusChanged();
      toast.success("Bağlantı sonlandırıldı.");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Bağlantı sonlandırılırken hata oluştu.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleConnect}>
      <div className="rounded-[28px] border border-white/80 bg-white/76 p-5 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <span className={`status-dot ${statusTone.dotClassName}`} />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {statusTone.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {statusTone.description}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={isRefreshing || isSubmitting}
          >
            {isRefreshing ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            Durumu Yenile
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="db-host">Sunucu</Label>
          <Input
            id="db-host"
            value={form.host}
            onChange={(event) => updateField("host", event.target.value)}
            placeholder="localhost"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="db-port">Port</Label>
          <Input
            id="db-port"
            value={form.port}
            onChange={(event) => updateField("port", event.target.value)}
            inputMode="numeric"
            placeholder="5432"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="db-user">Kullanıcı</Label>
          <Input
            id="db-user"
            value={form.user}
            onChange={(event) => updateField("user", event.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="db-password">Şifre</Label>
          <Input
            id="db-password"
            type="password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            autoComplete="current-password"
            placeholder={
              hasStoredConnection ? "Boş bırakırsanız mevcut şifre korunur" : "Şifre"
            }
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="db-database">Veritabanı</Label>
          <Input
            id="db-database"
            value={form.database}
            onChange={(event) => updateField("database", event.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="rounded-[28px] border border-primary/10 bg-primary/[0.04] p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Güvenli çerez saklama
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Bağlantı bilgileri istemci depolamasına yazılmaz. Sunucu tarafında
              şifrelenmiş, `httpOnly` çerez içinde tutulur.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Plug2 className="size-4" />
          )}
          Bağlan
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => void handleDisconnect()}
          disabled={isSubmitting || !status.configured}
        >
          <Unplug className="size-4" />
          Bağlantıyı Kes
        </Button>

        {status.connected ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" />
            {status.host} / {status.database}
          </div>
        ) : null}
      </div>
    </form>
  );
}
