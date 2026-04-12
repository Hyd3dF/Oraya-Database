import { Metadata } from "next";
import { Book, Code2, DatabaseZap, Lock, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "API Documentation | Oraya Database",
  description: "REST API Documentation for Oraya Database endpoints.",
};

function CodeBlock({ code, title }: { code: string; title?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-950 shadow-xl shadow-black/20 my-4">
      {title && (
        <div className="flex px-4 py-2 border-b border-zinc-800/60 bg-zinc-900/50">
          <span className="text-xs font-mono text-zinc-400">{title}</span>
        </div>
      )}
      <div className="p-4 overflow-x-auto">
        <pre className="text-xs font-mono text-zinc-300 leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-zinc-950">
      <div className="mx-auto w-full max-w-4xl px-6 py-12 lg:px-8">
        
        {/* Header */}
        <div className="mb-12 text-center md:text-left flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 mb-4 shadow-sm">
              <SparklesIcon className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-300">Developer Documentation</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">REST API Integration</h1>
            <p className="text-sm text-zinc-400 max-w-xl">
              Connect to your live PostgreSQL database using secure, encrypted API keys. Instantly access real-time endpoints for any table.
            </p>
          </div>
          <div className="hidden md:flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 shadow-xl">
            <Book className="h-8 w-8 text-white/80" />
          </div>
        </div>

        {/* Auth Section */}
        <section className="mb-12">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <Lock className="h-5 w-5 text-zinc-400" />
            Authentication
          </h2>
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6">
            <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
              Every request requires a valid API key. Keys are generated via the <strong className="text-white">API Keys</strong> management panel. You can authenticate either by providing a Bearer token or by using the <code className="text-zinc-300 bg-zinc-800/50 px-1.5 py-0.5 rounded">x-api-key</code> header.
            </p>
            <CodeBlock 
              title="Headers Example"
              code={`Authorization: Bearer your_api_key_here\n# OR\nx-api-key: your_api_key_here`} 
            />
          </div>
        </section>

        {/* Endpoints */}
        <section className="mb-12 space-y-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <DatabaseZap className="h-5 w-5 text-zinc-400" />
            Table Endpoints
          </h2>

          <div className="space-y-6">
            {/* GET */}
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="shrink-0 rounded-md bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">GET</span>
                <code className="text-sm text-zinc-200">/api/v1/[table]</code>
              </div>
              <p className="text-sm text-zinc-400 mb-4">Retrieve paginated records from a specific table.</p>
              <CodeBlock 
                title="GET /api/v1/users?limit=10&offset=0"
                code={`curl -X GET "https://api.oraya.com/api/v1/users?limit=10&offset=0" \\
  -H "Authorization: Bearer your_api_key_here"`} 
              />
            </div>

            {/* POST */}
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="shrink-0 rounded-md bg-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-400 border border-green-500/20">POST</span>
                <code className="text-sm text-zinc-200">/api/v1/[table]</code>
              </div>
              <p className="text-sm text-zinc-400 mb-4">Insert one or multiple rows into a table.</p>
              <CodeBlock 
                title="POST /api/v1/users"
                code={`curl -X POST "https://api.oraya.com/api/v1/users" \\
  -H "Authorization: Bearer your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "first_name": "Johnny",
    "last_name": "Appleseed",
    "email": "johnny@apple.com"
  }'`} 
              />
            </div>

            {/* PATCH */}
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="shrink-0 rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">PATCH</span>
                <code className="text-sm text-zinc-200">/api/v1/[table]</code>
              </div>
              <p className="text-sm text-zinc-400 mb-4">Update existing rows. Use URL query parameters to apply filters (WHERE clause).</p>
              <CodeBlock 
                title="PATCH /api/v1/users?email=johnny@apple.com"
                code={`curl -X PATCH "https://api.oraya.com/api/v1/users?email=johnny@apple.com" \\
  -H "Authorization: Bearer your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "first_name": "Jonathan"
  }'`} 
              />
            </div>

            {/* DELETE */}
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="shrink-0 rounded-md bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400 border border-red-500/20">DELETE</span>
                <code className="text-sm text-zinc-200">/api/v1/[table]</code>
              </div>
              <p className="text-sm text-zinc-400 mb-4">Delete rows from the table matching the specified URL query parameter filters.</p>
              <CodeBlock 
                title="DELETE /api/v1/users?email=johnny@apple.com"
                code={`curl -X DELETE "https://api.oraya.com/api/v1/users?email=johnny@apple.com" \\
  -H "Authorization: Bearer your_api_key_here"`} 
              />
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
