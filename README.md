# 🗄️ Veritabanı Yönetim Paneli

> A premium, full-stack PostgreSQL database management interface built with **Next.js 16**, **TypeScript**, **Tailwind CSS**, and **Shadcn UI**. Designed for developers who demand speed, clarity, and control over their data — entirely from the browser.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔌 **Dynamic Connection** | Connect to any PostgreSQL server at runtime — no config files required |
| 🔐 **Encrypted Sessions** | Connection credentials are AES-256-GCM encrypted and stored in `httpOnly` cookies |
| 📊 **Data Explorer** | Browse, paginate, and inspect table contents with a clean grid interface |
| 🏗️ **Schema Builder** | Visually design and create new tables with full column type & constraint support |
| 🔑 **API Key Manager** | Generate, label, revoke, and persist API keys backed by a local SQLite store |
| 🌙 **Dark-first Design** | Premium, minimalist dark UI with glassmorphism effects and smooth transitions |
| ⚡ **Instant Navigation** | Client-side routing with no full page reloads across all views |

---

## 🏛️ Architecture Overview

```
src/
├── app/                        # Next.js App Router — pages & API routes
│   ├── page.tsx                # Entry point — redirects to dashboard
│   ├── layout.tsx              # Root layout with font, sidebar, and toast provider
│   ├── globals.css             # Global design tokens and Tailwind base styles
│   ├── dashboard/              # Main database explorer page
│   ├── api-keys/               # API key management UI
│   ├── settings/               # Connection settings & session management
│   └── api/                    # REST API layer (server-side only)
│       ├── connect/            # POST /api/connect — validates & stores DB connection
│       ├── keys/               # GET/POST/DELETE /api/keys — API key CRUD
│       └── tables/
│           ├── route.ts        # GET /api/tables — list all tables with metadata
│           └── [name]/
│               ├── route.ts    # GET/DELETE /api/tables/[name] — table info & drop
│               ├── data/       # GET /api/tables/[name]/data — paginated row data
│               └── columns/    # GET/POST/DELETE /api/tables/[name]/columns/[col]
├── components/                 # Reusable UI components
│   ├── sidebar.tsx             # Navigation sidebar with connection status indicator
│   ├── connection-form.tsx     # PostgreSQL connection form with validation
│   ├── table-list.tsx          # Sidebar table browser with row count estimates
│   ├── data-table.tsx          # Virtual-scroll data grid for table contents
│   ├── api-key-card.tsx        # Individual API key display + revoke control
│   ├── page-header.tsx         # Consistent page heading component
│   └── schema-builder/         # Multi-step table creation wizard
│       ├── schema-builder-dialog.tsx
│       ├── column-row.tsx
│       ├── column-type-select.tsx
│       └── constraint-switches.tsx
├── lib/                        # Core server-side business logic
│   ├── db.ts                   # PostgreSQL engine — pool management, queries, schema introspection
│   ├── shared.ts               # Shared types, validators, and SQL identifier utilities
│   ├── sql-generator.ts        # Type-safe DDL/DML SQL statement builder
│   ├── api-keys-db.ts          # SQLite-backed API key store (via better-sqlite3)
│   └── utils.ts                # General-purpose helper utilities
└── hooks/                      # React custom hooks
    ├── use-connection.ts        # Connection status state & polling
    ├── use-schema-builder.ts    # Schema builder form state machine
    └── use-toast.ts             # Toast notification hook
```

---

## 🔐 Security Model

The panel implements a layered security approach:

- **AES-256-GCM encryption** — PostgreSQL credentials are never stored in plaintext. Each session cookie is encrypted with a random 12-byte IV and verified with an authentication tag, using a key derived from `DB_COOKIE_SECRET`.
- **HttpOnly cookies** — Connection tokens are inaccessible to JavaScript, preventing XSS-based credential theft.
- **SQL injection prevention** — All identifiers (table names, column names) are validated against a strict allowlist and double-quoted before use. Parameterized queries are used throughout for all user-supplied values.
- **Server-only boundary** — `db.ts` and `api-keys-db.ts` are marked `server-only` and can never be imported by client components.
- **API key authentication** — External clients must supply a valid `Authorization: Bearer <key>` header to access any data endpoint.

---

## 🗃️ Database Engine (`src/lib/db.ts`)

The core PostgreSQL layer provides:

- **Connection pooling** — A singleton `Pool` cache (keyed by `host:port:user:database`) with a maximum of 10 clients, 30s idle timeout, and 5s connection timeout. Pools auto-evict on error.
- **Transactional execution** — `executeStatementsWithStoredConnection()` wraps multi-statement DDL in a single `BEGIN / COMMIT / ROLLBACK` transaction.
- **Schema introspection** — `getTableSchema()` queries `pg_attribute`, `pg_class`, `pg_index`, and `pg_constraint` to return rich column metadata including type normalization, constraints, and default values.
- **Paginated data access** — `getTableData()` runs a parallel `COUNT(*)` + `SELECT` for efficient server-side pagination (capped at 500 rows per page).
- **Type normalization** — Raw PostgreSQL types (e.g., `character varying(255)`, `bigint` with `nextval`) are mapped to clean canonical types (`varchar`, `bigserial`, etc.).

---

## 🏗️ SQL Generator (`src/lib/sql-generator.ts`)

A type-safe, pure-function DDL/DML builder that produces valid PostgreSQL statements from structured input objects. Handles:

- `CREATE TABLE` with full column definitions, constraints, and defaults
- `ALTER TABLE` for adding/dropping/renaming columns
- `DROP TABLE` with `IF EXISTS` safety guard
- Column type casting and constraint management

---

## 🔑 API Key Store (`src/lib/api-keys-db.ts`)

API keys are managed locally using **better-sqlite3** (synchronous SQLite). Each key record includes:

- `id` — UUID v4 identifier
- `key` — Randomly generated 32-byte hex token
- `label` — Human-readable description
- `created_at` — ISO timestamp
- `last_used_at` — Updated on each authenticated request

The SQLite database file is stored at `data/api-keys.db` and is automatically initialized on first boot.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 + tailwindcss-animate |
| UI Components | Shadcn UI (Radix UI primitives) |
| Database Client | `pg` (node-postgres) |
| Local Storage | `better-sqlite3` |
| Icons | Lucide React |
| Notifications | Sonner |
| Font | Inter (via `@fontsource/inter`) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.18 or higher
- A running **PostgreSQL** instance (local or remote)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Hyd3dF/oroya.1.git
cd oroya.1

# 2. Install dependencies
npm install

# 3. (Optional) Configure a cookie encryption secret
#    If omitted, a development-only fallback is used — do NOT omit in production.
echo "DB_COOKIE_SECRET=your-strong-random-secret-here" > .env.local

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### First-Time Setup

1. Navigate to **Settings** and enter your PostgreSQL connection details (host, port, user, password, database).
2. Click **Connect** — your credentials are encrypted and stored in a session cookie.
3. The **Dashboard** will populate with all tables in the `public` schema.
4. Use the **Schema Builder** to create new tables, or **Data Explorer** to inspect existing ones.
5. Visit **API Keys** to generate tokens for external client access.

---

## 🌐 API Reference

All API routes are located under `/api/` and are server-side only (Next.js Route Handlers).

```
POST   /api/connect               — Establish a database session
GET    /api/tables                — List all tables with metadata
GET    /api/tables/:name          — Get table schema
DELETE /api/tables/:name          — Drop a table
GET    /api/tables/:name/data     — Fetch paginated row data (?limit=&offset=)
GET    /api/tables/:name/columns  — List columns
POST   /api/tables/:name/columns  — Add a column
DELETE /api/tables/:name/columns/:col — Drop a column
GET    /api/keys                  — List all API keys
POST   /api/keys                  — Create a new API key
DELETE /api/keys/:id              — Revoke an API key
```

External data endpoints require `Authorization: Bearer <api-key>` header.

---

## 📦 Production Deployment

```bash
# Build the production bundle
npm run build

# Start the production server
npm start
```

> **Important:** Set `DB_COOKIE_SECRET` to a strong, randomly generated value (32+ characters) in your production environment. Without it, session cookies use an insecure development fallback.

For one-click cloud deployment, use **Vercel** — the platform built by the Next.js team:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Hyd3dF/oroya.1)

---

## 📄 License

This project is private and proprietary. All rights reserved.
