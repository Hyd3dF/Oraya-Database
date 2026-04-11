"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  KeyRound,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const requestExample = `const apiKey = process.env.ORAYA_API_KEY;
const headers = {
  "Content-Type": "application/json",
  Authorization: "Bearer " + apiKey,
};

// READ: list or fetch records from a protected endpoint
await fetch("https://your-domain.com/api/customers?status=active&limit=20", {
  method: "GET",
  headers,
});

// CREATE: send a realistic JSON body
await fetch("https://your-domain.com/api/customers", {
  method: "POST",
  headers,
  body: JSON.stringify({
    name: "Northwind Traders",
    email: "billing@northwind.com",
    plan: "growth",
    status: "active",
    billingAddress: {
      line1: "11 Water St",
      city: "London",
      country: "UK",
    },
  }),
});

// UPDATE: use PATCH for partial changes or PUT for full replacement
await fetch("https://your-domain.com/api/customers/cus_124", {
  method: "PATCH",
  headers,
  body: JSON.stringify({
    plan: "enterprise",
    status: "paused",
    metadata: { owner: "ops-team" },
  }),
});

// DELETE: remove an existing record
await fetch("https://your-domain.com/api/customers/cus_123", {
  method: "DELETE",
  headers,
});`;

const responseExample = `GET /api/customers?status=active&limit=20
200 OK
{ "items": [{ "id": "cus_123", "name": "Northwind Traders", "status": "active" }], "total": 1 }

POST /api/customers
201 Created
{ "id": "cus_124", "name": "Northwind Traders", "plan": "growth", "status": "active" }

PATCH /api/customers/cus_124
200 OK
{ "id": "cus_124", "plan": "enterprise", "status": "paused" }

DELETE /api/customers/cus_124
200 OK
{ "deleted": true, "id": "cus_124" }

Missing Authorization header
401 Unauthorized
{ "error": "Authorization header is required." }

Incorrect or deleted API key
401 Unauthorized
{ "error": "Invalid API key." }

Unauthorized request
403 Forbidden
{ "error": "Not authorized for this endpoint." }`;

const aiPrompt = `You are integrating with an Oraya Database workspace that uses generated API keys.

Treat the API key as a backend bearer secret with an ora_ prefix. It is created in the API Keys UI, copied once, stored in server-side configuration, and deleted or replaced if it is exposed.

Send the key in requests with this exact header format:
Authorization: Bearer <API_KEY>

What the key protects:
- It grants access only to the protected endpoint that already validates this key.
- It does not grant access to the entire system, database, admin UI, or unrelated routes.

How to use it:
- GET: read data from a protected route.
- POST: create data by sending a JSON body.
- PATCH or PUT: update existing data.
- DELETE: remove an existing record.
- Keep the existing route structure. The key authenticates the caller; it does not create endpoints or define schemas.

Failure handling:
- Missing Authorization header: reject the request.
- Incorrect, deleted, or malformed key: reject as unauthorized.
- Valid key on an endpoint that does not allow this caller: reject as unauthorized or forbidden.

Storage and rotation:
- Store the key only in environment variables or a secret manager.
- Never expose it in frontend code, browser requests, mobile apps, or public repositories.
- If the key is exposed or no longer trusted, delete it and create a new one.

Unsupported features:
- No scoped permissions per key.
- No frontend-safe or public client usage.
- No temporary token or session exchange flow.
- No automatic endpoint authorization or policy creation.

When generating code, assume the protected endpoint already exists and the main requirement is to attach the bearer key correctly on backend GET, POST, PATCH/PUT, and DELETE requests.`;

const quickFacts = [
  {
    title: "Generated in API Keys",
    description: "Create the key in the API Keys UI, copy it once, then store it in the backend service that will call the protected route.",
    value: "ora_ prefixed",
    icon: KeyRound,
  },
  {
    title: "Protects the route",
    description: "The key authenticates access to a protected endpoint that already checks it. It is not global access to the full system.",
    value: "Endpoint only",
    icon: Server,
  },
  {
    title: "Backend usage",
    description: "Use the same bearer header for server-side GET, POST, PATCH/PUT, and DELETE requests. No scopes or temporary tokens.",
    value: "CRUD support",
    icon: ShieldCheck,
  },
];

const keyFlow = [
  {
    title: "Create and store the key",
    description:
      "Generate the key in the API Keys page, copy it into an environment variable or secret manager, and use the UI to reveal, copy, or delete it later.",
  },
  {
    title: "Authenticate each protected request",
    description:
      "Send Authorization: Bearer <API_KEY> on every protected GET, POST, PATCH/PUT, and DELETE request. The key authenticates the caller, then the endpoint handles the read, create, update, or delete action.",
  },
  {
    title: "Know the boundary",
    description:
      "The key grants access only to the endpoint that already validates it. It does not provide system-wide access, create routes, add scoped permissions, make frontend use safe, or provide temporary token flows.",
  },
];

const securityNotes = [
  {
    title: "Name keys by integration",
    description: "Use clear names so you can quickly identify which backend job or integration is making protected requests.",
    icon: Trash2,
  },
  {
    title: "Protected endpoint only",
    description: "A valid key unlocks only the endpoint that is configured to accept it, not the entire product or every route.",
    icon: ShieldCheck,
  },
  {
    title: "Do not send from the frontend",
    description: "Keep API keys out of browser bundles, public frontend calls, mobile apps, and any user-visible request flow.",
    icon: Server,
  },
  {
    title: "Unsupported today",
    description: "There are no scoped permissions, no public-client mode, and no temporary token exchange layered on top of the key.",
    icon: KeyRound,
  },
];

const requestFlowNotes = [
  {
    title: "GET",
    description: "Read a list or a single record from a protected endpoint by sending the bearer key in the header.",
  },
  {
    title: "POST",
    description: "Create a new record by sending a realistic JSON payload to the protected route with the same header.",
  },
  {
    title: "PATCH / PUT",
    description: "Update part of a record with PATCH or replace the full resource when the endpoint expects PUT.",
  },
  {
    title: "DELETE",
    description: "Delete an existing record by id after the server validates the same bearer key.",
  },
];

const errorNotes = [
  {
    title: "Missing header",
    description: "If Authorization is missing, reject the request before any protected read or write runs.",
  },
  {
    title: "Incorrect key",
    description: "If the key is invalid, malformed, deleted, or revoked, return an unauthorized error.",
  },
  {
    title: "Unauthorized request",
    description: "If the endpoint does not allow that caller, return unauthorized or forbidden based on server policy.",
  },
];

function CopyableBlock({
  title,
  description,
  code,
  copied,
  onCopy,
  tone = "default",
}: {
  title: string;
  description: string;
  code: string;
  copied: boolean;
  onCopy: () => void;
  tone?: "default" | "accent";
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border shadow-xl shadow-black/20",
        tone === "accent"
          ? "border-sky-500/20 bg-sky-500/[0.05]"
          : "border-zinc-800/60 bg-zinc-900/40",
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-white/6 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-zinc-100">{title}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCopy}
          className="shrink-0 rounded-lg border border-white/8 bg-white/5 px-3 text-zinc-300 hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <pre className="overflow-x-auto px-5 py-4 text-[13px] leading-6 text-zinc-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function DocsPage() {
  const [copiedBlock, setCopiedBlock] = useState<"request" | "response" | "prompt" | null>(null);

  async function handleCopy(type: "request" | "response" | "prompt", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedBlock(type);
      toast.success(
        type === "request"
          ? "Request examples copied."
          : type === "response"
            ? "Response examples copied."
            : "AI prompt copied.",
      );
      window.setTimeout(() => {
        setCopiedBlock((current) => (current === type ? null : current));
      }, 1800);
    } catch {
      toast.error("Copy failed.");
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Using API Keys</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Understand where keys are generated, what they protect, and how they are used for read, create, update, and delete requests.
          </p>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          {quickFacts.map((fact) => {
            const Icon = fact.icon;
            return (
              <div
                key={fact.title}
                className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 px-4 py-4 shadow-lg shadow-black/10"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
                    <Icon className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{fact.title}</p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-600">{fact.value}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{fact.description}</p>
              </div>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-xl shadow-black/20">
          <section className="border-b border-white/6 px-6 py-6">
            <div className="mb-5 flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-600">
                Key Logic
              </span>
            </div>
            <div className="grid gap-4">
              {keyFlow.map((item, index) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/5 text-xs font-medium text-zinc-300">
                    0{index + 1}
                  </div>
                  <div className="pt-0.5">
                    <p className="text-sm font-medium text-zinc-200">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-500">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border-b border-white/6 px-6 py-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-100">Request Examples</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Use these patterns when a backend or integration service calls an existing endpoint that is protected with an Oraya API key. The same key handles authentication, while the endpoint performs the actual read, create, update, or delete action.
                </p>
              </div>
            </div>

            <CopyableBlock
              title="Read, create, update, and delete requests"
              description="Load the key from secure server-side config and send it in the same bearer header for GET, POST, PATCH/PUT, and DELETE operations."
              code={requestExample}
              copied={copiedBlock === "request"}
              onCopy={() => void handleCopy("request", requestExample)}
            />

            <div className="mt-4">
              <CopyableBlock
                title="Short responses and failure cases"
                description="Use short success and error examples so integrations know what a normal response, missing header, bad key, or unauthorized request looks like."
                code={responseExample}
                copied={copiedBlock === "response"}
                onCopy={() => void handleCopy("response", responseExample)}
              />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {requestFlowNotes.map((note) => (
                <div key={note.title} className="rounded-lg bg-white/[0.03] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">{note.title}</p>
                  <p className="mt-1 text-sm text-zinc-400">{note.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {errorNotes.map((note) => (
                <div key={note.title} className="rounded-lg bg-white/[0.03] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">{note.title}</p>
                  <p className="mt-1 text-sm text-zinc-400">{note.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="border-b border-white/6 px-6 py-6">
            <p className="text-sm font-medium text-zinc-100">Security Notes</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {securityNotes.map((note) => {
                const Icon = note.icon;
                return (
                  <div key={note.title} className="flex gap-3 rounded-lg bg-white/[0.03] px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                      <Icon className="h-4 w-4 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{note.title}</p>
                      <p className="mt-1 text-sm leading-6 text-zinc-500">{note.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="px-6 py-6">
            <div className="mb-4 flex items-center gap-2 text-zinc-100">
              <Sparkles className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium">AI Integration Prompt</p>
            </div>

            <CopyableBlock
              title="Ready-to-copy prompt"
              description="Paste this into any AI assistant so it immediately understands what the key protects, how to attach it, how CRUD flows work, and which features are not supported."
              code={aiPrompt}
              copied={copiedBlock === "prompt"}
              onCopy={() => void handleCopy("prompt", aiPrompt)}
              tone="accent"
            />
          </section>
        </div>
      </div>
    </div>
  );
}
