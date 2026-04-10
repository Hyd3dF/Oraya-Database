# 🪐 Oraya Database

[![Build Status](https://img.shields.io/github/actions/workflow/status/Hyd3dF/oroya.1/main.yml?style=for-the-badge)](https://github.com/Hyd3dF/oroya.1)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue?style=for-the-badge)](./LICENSE)
[![Branding](https://img.shields.io/badge/Branding-Protected-orange?style=for-the-badge)](./NOTICE)
[![Deploy with Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/new/clone?repository-url=https://github.com/Hyd3dF/oroya.1)

> **Oraya Database** is a premium, high-performance PostgreSQL management engine designed for the modern web. Built with Next.js 16 and a glassmorphism philosophy, it provides a seamless browser-based portal to your data infrastructure.

---

## 🛠️ Tech Stack 

| Layer | Technology |
|---|---|
| **Core** | ![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white) |
| **Logic** | ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) |
| **Styles** | ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white) |
| **Data** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white) |

---

## ✨ Features

- 🔌 **Dynamic Connection**: Link any PostgreSQL instance instantly via encrypted session cookies.
- 🏗️ **Smart Schema Builder**: Visually design tables with advanced constraint support.
- 📊 **Unified Data Explorer**: Modern grid interface with server-side pagination and deep inspection.
- 🔑 **Secure Key Management**: local SQLite-backed API gateway for external client access.
- 🌙 **Glassmorphism UI**: Premium dark-mode aesthetics using Shadcn UI and Inter typography.

---

## 📜 Social Contract & Branding

Oraya Database is proud to be **Open Source**. We believe in data transparency and developer empowerment.

> [!IMPORTANT]
> **Branding Requirement**: As specified in the [NOTICE](./NOTICE) and [RULES.md](./RULES.md), all derivative works, forks, or hosted versions MUST retain the **Oraya Database** branding. You are free to use, modify, and distribute this software, but the "Powered by Oraya" identity is a mandatory condition of the license.

---

## 🏛️ Architecture

```
src/
├── app/                        # Next.js App Router — pages & API routes
├── components/                 # Reusable UI components (Shadcn UI base)
├── lib/                        # Core server-side engines (DB, SQL, Keys)
└── hooks/                      # Custom React state machines
```

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/Hyd3dF/oroya.1.git
cd oroya.1
npm install
```

### 2. Environment Setup
Create a `.env.local` file:
```bash
DB_COOKIE_SECRET=your_32_character_secret
```

### 3. Launch
```bash
npm run dev
```

---

## 🌐 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/connect` | `POST` | Establish encrypted DB session |
| `/api/tables` | `GET` | List all tables & metadata |
| `/api/tables/:name/data` | `GET` | Fetch paginated row data |
| `/api/keys` | `POST` | Generate new API gateway credentials |

---

## 🤝 Contributing

We welcome contributions! Please read our [CONTRIBUTING.md](./CONTRIBUTING.md) and [RULES.md](./RULES.md) before submitting a pull request.

---

## 📄 License

Licensed under the **Apache License, Version 2.0**. See [LICENSE](./LICENSE) for full details.

**Oraya Database — The bridge between your vision and your data.**
