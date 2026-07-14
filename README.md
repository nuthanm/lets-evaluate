# Let's Evaluate

> **AI-powered technical hiring platform** — configure projects and roles, screen candidates with AI-assisted resume analysis, run structured evaluations, assign interviewers, and track the full pipeline in one org-ready portal.
<img width="1888" height="921" alt="image" src="https://github.com/user-attachments/assets/2e075e30-65ad-481a-91cd-ac12d187688f" />
---

## Features

| Feature | Description |
|---|---|
| Authentication | Email/password sign-up and sign-in; optional Microsoft Entra ID SSO |
| Role-based access | `admin`, `ta`, `interviewer`, `manager`, and `hr` roles with tailored navigation |
| Projects & roles | Configure tech stacks, roles, and reusable question banks |
| Interview process | Define pipeline stages per organization |
| Openings | Track open positions linked to projects and roles |
| AI screening | Upload resume → parse → tech match, strengths, gaps, and tailored questions |
| Candidate pipeline | Track candidates from screening through interview to decision |
| Interviewer assignment | Assign panel members and manage their workload |
| Booking | Schedule and coordinate interview slots |
| Mail templates | In-app placeholder emails — copy or open in your mail client (no third-party mail API) |
| Bulk import | CSV import for candidates |
| Audit log | Organization-wide activity history |
| Archives | Browse past evaluations and outcomes |
| White-label branding | Per-deployment org name, colors, logo, and domain restrictions |
| Resume storage | Local filesystem (dev) or S3-compatible object storage like Cloudflare R2 (prod) |

---

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **Auth.js** (credentials + optional Microsoft Entra ID)
- **Drizzle ORM** + standard **PostgreSQL** (Neon, Supabase, Azure, RDS, Railway, etc.)
- **OpenAI** (`gpt-4o` for resume analysis, `gpt-4o-mini` for questions and notes)

All application code lives in the [`web/`](web/) directory.

---

## Quick start

### Prerequisites

- **Node.js 20+**
- **PostgreSQL** database (local, Docker, or a free cloud instance)
- **OpenAI API key**

### 1. Clone and install

```bash
git clone https://github.com/nuthanm/lets-evaluate.git
cd lets-evaluate/web

npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with at least:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
AUTH_SECRET=your-32-char-random-secret
OPENAI_API_KEY=your_openai_api_key_here
```

Generate a secure `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

See [Configuration](#configuration) and [`web/.env.example`](web/.env.example) for the full list of options.

### 3. Set up the database

```bash
npm run db:push    # apply schema
npm run db:seed    # create default organization
```

### 4. Run the dev server

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

The first user to register becomes an **admin** for the seeded organization (when using credentials auth).

---

## Configuration

Copy [`web/.env.example`](web/.env.example) to `web/.env.local` and customize for your organization.

### Core (required)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | 32+ character random string for session signing |
| `OPENAI_API_KEY` | OpenAI API key |
| `AUTH_URL` | Public app URL in production (e.g. `https://evaluate.yourcompany.com`) |

### OpenAI models (optional)

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_ANALYSIS_MODEL` | `gpt-4o` | Resume screening and analysis |
| `OPENAI_MODEL` | `gpt-4o-mini` | Question generation and evaluator notes |

### Organization (one org per deployment)

| Variable | Description |
|---|---|
| `ORG_SLUG` | URL-safe org identifier (default `kanini`) |
| `ORG_NAME` | Display name (default `KANINI`) |
| `ALLOWED_EMAIL_DOMAIN` | Restrict register/login to a single email domain |
| `NEXT_PUBLIC_EMAIL_DOMAIN` | Same domain for form placeholders |
| `NEXT_PUBLIC_ORG_NAME` | Org name shown in the client UI |

### White-label branding

Set `NEXT_PUBLIC_APP_TITLE`, `NEXT_PUBLIC_BRAND_TAGLINE`, `NEXT_PUBLIC_BRAND_PRIMARY`, and related `NEXT_PUBLIC_BRAND_*` variables to rebrand the deployment. See [`web/.env.example`](web/.env.example) for the full palette.

**Example — rebrand for Acme Corp:**

```env
ORG_SLUG=acme
ORG_NAME=Acme Corp
ALLOWED_EMAIL_DOMAIN=acme.com
NEXT_PUBLIC_EMAIL_DOMAIN=acme.com
AUTH_URL=https://hiring.acme.com
NEXT_PUBLIC_APP_TITLE=Acme Hiring
NEXT_PUBLIC_APP_TITLE_ACCENT=Hiring
NEXT_PUBLIC_BRAND_TAGLINE=Hire with confidence
NEXT_PUBLIC_BRAND_PRIMARY=#4F46E5
```

### Resume storage (optional)

| Variable | Description |
|---|---|
| `RESUME_STORAGE_PROVIDER` | `local` (default) or `s3` |
| `S2_BUCKET`, `S2_REGION`, `S2_ENDPOINT`, `S2_ACCESS_KEY_ID`, `S2_SECRET_ACCESS_KEY` | Required when using S2-compatible storage settings for Cloudflare R2 |

**Cloudflare R2 example**

```env
RESUME_STORAGE_PROVIDER=s3
S2_BUCKET=your-bucket-name
S2_REGION=auto
S2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S2_ACCESS_KEY_ID=your-r2-access-key
S2_SECRET_ACCESS_KEY=your-r2-secret-key
```

### Microsoft Entra ID SSO (optional)

Configure `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`, and group-to-role mappings (`AZURE_AD_ADMIN_GROUPS`, `AZURE_AD_TA_GROUPS`, etc.).

> Never commit `.env.local` or secrets to version control.

---

## Database

**PostgreSQL is required.** The app will not start without a valid `DATABASE_URL`.

### Free cloud PostgreSQL (no local install needed)

| Provider | Free tier | Setup time |
|---|---|---|
| [Neon](https://neon.tech) | Free serverless Postgres | ~2 min |
| [Supabase](https://supabase.com) | Generous free tier | ~2 min |
| [Railway](https://railway.app) | Free starter plan | ~3 min |

**Example (Neon):**

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string from the dashboard
3. Paste it as `DATABASE_URL` in `web/.env.local`

### Schema management

```bash
npm run db:push       # push Drizzle schema (quick local/dev setup)
npm run db:generate   # generate SQL migration files
npm run db:migrate    # apply migrations in drizzle/
npm run db:seed       # create default organization (idempotent)
```

Migration SQL files live in [`web/drizzle/`](web/drizzle/).

### Data persistence

All application data lives in PostgreSQL. Redeploying or restarting the app does not affect stored data as long as `DATABASE_URL` points to the same database.

---

## Roles and workflow

| Role | Capabilities |
|---|---|
| `admin` | Full setup (projects, roles, pipeline, openings) + all TA capabilities |
| `ta` | Screen candidates, manage pipeline, assign interviewers, book interviews |
| `interviewer` | View assigned candidates, submit interview reviews |
| `manager` / `hr` | Panel roles — same assignment-focused view as interviewers |

**Typical flow:** TA screens a candidate → decision (proceed / hold / reject) → assign interviewer → panel conducts review → outcome recorded in pipeline and archives.

---

## Deployment

### Vercel + Neon (recommended)

1. Create a [Neon](https://neon.tech) project and copy `DATABASE_URL`.
2. From `web/`, link the project: `vercel link`
3. Add environment variables in the Vercel dashboard:
   - `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `OPENAI_API_KEY`
   - Org and branding vars as needed
4. Apply schema: `npm run db:push` (or `npm run db:migrate`)
5. Seed org: `npm run db:seed`
6. Deploy: `vercel deploy --prod` or run `bash scripts/deploy.sh`

### Self-hosted

```bash
cd web
npm run build
npm start
```

Set `AUTH_URL` to your public URL and ensure `DATABASE_URL` is reachable from the server.

### Moving between cloud databases

```bash
# Export
pg_dump -Fc "$DATABASE_URL" > lets-evaluate.dump

# Restore to new host
pg_restore -d "$NEW_DATABASE_URL" --clean --if-exists lets-evaluate.dump

# Update DATABASE_URL in your hosting provider and redeploy
```

See [`web/docs/cloud-migration.md`](web/docs/cloud-migration.md) for Neon → Azure Postgres and S3 resume migration steps.

---

## Project structure

```
lets-evaluate/
└── web/
    ├── src/
    │   ├── app/                    # Next.js App Router pages & API routes
    │   │   ├── (app)/              # Authenticated app shell
    │   │   │   ├── people/         # Role-based dashboard
    │   │   │   ├── setup/          # Projects, roles, pipeline config
    │   │   │   ├── openings/       # Open positions board
    │   │   │   ├── candidates/     # Candidate grid
    │   │   │   ├── evaluate/       # AI screening wizard
    │   │   │   ├── interviewers/   # Panel management
    │   │   │   ├── booking/        # Interview scheduling
    │   │   │   ├── pipeline/       # Hiring pipeline view
    │   │   │   ├── assignments/    # Panel member assignments
    │   │   │   └── archive/        # Past evaluations
    │   │   ├── api/                # REST API routes
    │   │   ├── login/              # Sign in
    │   │   └── register/           # Sign up
    │   ├── components/             # Shared UI components
    │   └── lib/
    │       ├── auth/               # Auth.js config, RBAC, validation
    │       ├── db/                 # Drizzle schema, queries
    │       ├── ai/                 # OpenAI integration
    │       ├── resume/             # Resume parsing (PDF/DOCX)
    │       └── storage/            # Resume file storage
    ├── drizzle/                    # SQL migrations
    ├── scripts/
    │   ├── seed-org.ts             # Default organization seed
    │   └── deploy.sh               # Vercel deploy helper
    ├── .env.example                # Environment template
    └── package.json
```

---

## NPM scripts

Run these from the `web/` directory:

| Script | Description |
|---|---|
| `npm run dev` | Development server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Apply Drizzle schema to database |
| `npm run db:generate` | Generate SQL migration files |
| `npm run db:migrate` | Run migrations from `drizzle/` |
| `npm run db:seed` | Create default organization |

---

## Architecture

```mermaid
flowchart TD
    User(["User (Browser)"])

    subgraph NextApp["Next.js Application (web/)"]
        direction TB
        Landing["Landing page\n/"]

        subgraph AppPages["Authenticated app"]
            Dashboard["/people\nRole dashboard"]
            Setup["/setup\nProjects · Roles · Pipeline"]
            Evaluate["/evaluate\nAI screening wizard"]
            Pipeline["/pipeline · /archive\nHiring records"]
            Booking["/booking · /assignments\nScheduling & panel"]
        end

        subgraph Lib["Server libraries"]
            Auth["auth/\nAuth.js + RBAC"]
            DB["db/\nDrizzle ORM"]
            AI["ai/\nOpenAI"]
            Storage["storage/\nResume files"]
        end

        API["API routes\n/app/api/*"]
    end

    subgraph External["External services"]
        OpenAI["OpenAI API"]
        PG["PostgreSQL"]
        S3["S3 / object storage\n(optional)"]
        Entra["Microsoft Entra ID\n(optional SSO)"]
    end

    User -->|HTTPS| Landing
    User --> AppPages
    AppPages --> API
    API --> Lib
    Auth --> PG
    DB --> PG
    AI --> OpenAI
    Storage --> S3
    Auth -.-> Entra
```

---

## Security notes

- Passwords are hashed with **bcrypt** (never stored in plain text)
- API keys and secrets are loaded from environment variables only
- Optional email-domain restriction limits who can register
- Role-based access control gates setup, screening, and assignment actions
- Database credentials stay in `DATABASE_URL`, separate from application code

---

## Contributing

Pull requests are welcome. Please open an issue first to discuss significant changes.

For product scope and roadmap context, see [`docs/product-alignment-v1.md`](docs/product-alignment-v1.md).

---

## License

MIT
