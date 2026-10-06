# KotaCloud Spaces Frontend (Web Dashboard)

**KotaCloud Spaces Frontend** is the official web console and developer dashboard for the KotaCloud Spaces Platform-as-a-Service (PaaS) — providing an intuitive, premium interface (inspired by Vercel and Railway) to create projects, provision multi-service environments, manage database instances, inspect deployment logs, and configure domains.

---

## ✨ Features & Capabilities

### 1. Multi-Service Project Workspace
- **Environment Architecture**: Group related microservices, frontend applications, workers, and databases under a single unified project workspace.
- **Service Provisioning**:
  - **Git Deployments**: Connect to GitHub/GitLab repositories with branch selection, root directory configuration, and auto-deploy toggles.
  - **Database Instances**: 1-click zero-config database deployment for PostgreSQL, MariaDB, MySQL, Redis, and MongoDB with preconfigured credentials and ports.
  - **Docker Images**: Deploy public or private Docker registry images with custom entrypoints and port mapping.
  - **Local Archive Deployments**: Drag-and-drop or upload `.zip` and `.tar.gz` source archives directly from your machine.
- **Resource Limits & Cost Estimator**: Real-time allocation slider for vCPU (`0.125` to `4.0`) and RAM (`128 MB` to `8 GB`) with live estimated billing calculations.

### 2. GitHub App Integration & Commit Tracking
- **Official GitHub App Integration**: Connect GitHub accounts and install the official `Kotacloud Spaces` app with frictionless in-app repository selection.
- **Real Commit Message Resolution**: View actual commit messages (e.g. `"Update: Changing the language from Indonesia to English"`) fetched directly from GitHub with hover tooltips and direct clickable commit links (`[e4dde1b]`).
- **Auto-Redeploy Controls**: Toggle automated redeployment on Git push events with background polling sync.

### 3. Real-Time Deployment & Container Logs
- **Interactive Tabbed Terminal**: Multi-tab log interface to monitor concurrent deployments.
- **Build Logs & Status Stream**: Live streaming build phases (`QUEUED`, `BUILDING`, `DEPLOYING`, `RUNNING`, `FAILED`).
- **Docker Container Runtime Logs**: Inspect live container stdout and stderr with log level color-coding (`INFO`, `WARN`, `ERROR`, `DEBUG`) and tail limits.

### 4. Container Lifecycle Controls
- Instant 1-click container actions: **Deploy**, **Start**, **Stop**, **Restart**, and **Remove**.
- Visual status indicators and uptime health badges.

### 5. Domains & Networking
- Ingress subdomain allocation (e.g. `your-service.spaces.local`).
- Custom domain management with CNAME/A-record verification guidelines.

### 6. Authentication & User Profile
- Email & Password registration with bcrypt verification.
- Passwordless 6-digit Email OTP login.
- OAuth 2.0 social authentication: **GitHub**, **Google**, and **GitLab**.
- Automatic profile avatar sync from GitHub / Google.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Core Library**: React 19
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **TypeScript**: Strict type checking with shared backend DTO interfaces
- **Compiler**: Turbopack for ultra-fast development builds

---

## 📂 Project Structure

```
kospaces-frontend/
├── app/
│   ├── api/                     # Next.js API proxy routes (OAuth callbacks, OTP)
│   ├── login/                   # Login page (Email, OAuth, OTP)
│   ├── register/                # User registration page
│   ├── workspace/
│   │   ├── deployments/         # Global deployments overview & log viewer
│   │   ├── domains/             # Global domains overview
│   │   ├── projects/
│   │   │   ├── new/             # Project creation wizard
│   │   │   ├── [projectId]/     # Project details & service list
│   │   │   │   ├── services/[serviceId]/ # Detailed service dashboard, Git info, logs
│   │   │   │   └── deployments/ # Project deployment history
│   │   │   └── page.tsx         # Projects list page
│   │   └── settings/            # User account settings, tokens & credentials
│   ├── layout.tsx               # Root layout with font and theme configurations
│   ├── page.tsx                 # Landing page
│   └── globals.css              # Design tokens and Tailwind CSS v4 styling
├── components/
│   ├── deployments/             # Deployment cards, log viewer, status badges
│   ├── domains/                 # Domain management components
│   ├── layout/                  # Sidebar, Topbar, Navigation
│   ├── projects/                # Project cards, GitHub repo selector
│   ├── services/                # Service creation modal, resource sliders, topology
│   ├── settings/                # Environment variable editors
│   └── ui/                      # Reusable UI primitives (Dialog, Buttons, Inputs, Cards)
├── hooks/                       # Custom React hooks
├── lib/
│   ├── api/                     # HTTP client methods for Backend Control Plane
│   └── git.ts                   # Git and URL utility helpers
├── types/                       # TypeScript interfaces (Auth, Service, Deployment, Domain)
├── middleware.ts                # Route protection & session validation
├── .env.example                 # Environment variables template
├── package.json                 # Project dependencies and scripts
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20.x or higher
- npm, yarn, or pnpm
- Running [KotaCloud Spaces Backend (Control Plane)](../kospaces-backend) on port `8080`

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd kospaces-frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`:
   ```env
   # Backend Control Plane Base URL
   NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for Production:**
   ```bash
   npm run build
   npm start
   ```

---

## 🎨 Design & UI Philosophy

- **Dark Mode Native**: High-contrast, sleek palette tailored for developers (`zinc-950` backgrounds, subtle borders `zinc-800`, cyan/teal status accents).
- **Responsive Layout**: Fluid layout supporting mobile, tablet, and wide desktop displays.
- **Glassmorphism & Micro-animations**: Refined transitions, collapsible sidebars, and interactive cards for an ultra-responsive feel.
- **Accessible & Informative**: Clear error envelopes, hover tooltips for long commit messages, and keyboard-friendly dialogs.

---

## 📄 License & Ownership

Proprietary — Developed for **KotaCloud Spaces**. All rights reserved.
