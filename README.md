# 🎯 Let's Evaluate

> **AI-powered interview evaluation platform** — upload a resume, get instant AI analysis, generate tailored interview questions, score candidates, and archive everything in one elegant app.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 Authentication | Register, Login, Forgot Password (email passcode) |
| 📁 Projects | Create/edit/delete projects with tech stack configuration |
| 👥 Roles | Define roles linked to projects |
| ❓ Questions | Build a reusable question bank linked to roles |
| 🤖 AI Evaluation | Upload resume → AI analysis → question generation → submit |
| 📂 Archives | Browse past evaluations, update status, download PDF reports |

---

## 🚀 Quick Start

### 1. Clone & set up environment

```bash
git clone https://github.com/nuthanm/lets-evaluate.git
cd lets-evaluate

python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

pip install -r requirements.txt
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values (see [Configuration](#-configuration) below).

### 3. Run the app

```bash
streamlit run app.py
```

Open **http://localhost:8501** in your browser.

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and fill in the values:

```env
# ── OpenAI ────────────────────────────────────────────────────────────────────
OPENAI_API_KEY=sk-...your-key-here...

# ── Email (SMTP) ───────────────────────────────────────────────────────────────
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here   # NOT your regular password — see below
EMAIL_FROM=your_email@gmail.com

# ── Optional overrides ─────────────────────────────────────────────────────────
# SMTP_HOST=smtp.gmail.com            # auto-selected based on provider in UI
# SMTP_PORT=587
# DATABASE_URL=sqlite:///./lets_evaluate.db
# APP_SECRET_KEY=change-me
```

### 📧 Email Setup — Getting an App Password

The "Forgot Password" feature sends a 6-digit passcode via email. Use an **App Password** (not your normal login password).

#### Gmail
1. Enable 2-Step Verification: <https://myaccount.google.com/security>
2. Go to **Security → App Passwords** (search "App passwords")
3. Select **Mail** + **Other (Custom name)** → name it "Let's Evaluate"
4. Copy the 16-character password and paste into `SMTP_PASSWORD`
5. Set `SMTP_USERNAME` and `EMAIL_FROM` to your Gmail address

#### Microsoft Outlook / Hotmail
1. Sign in at <https://account.microsoft.com/security>
2. Go to **Advanced security options → App passwords**
3. Create a new app password and copy it into `SMTP_PASSWORD`
4. Set `SMTP_USERNAME` = your full Outlook email address

#### Yahoo Mail
1. Sign in and go to **Account Security**: <https://login.yahoo.com/account/security>
2. Enable **Two-step verification** then create an **App Password**
3. Copy the generated password into `SMTP_PASSWORD`
4. Set `SMTP_USERNAME` = your Yahoo email address

> ⚠️ **Important**: Never commit your `.env` file to version control. It is already listed in `.gitignore`.

---

## 🗄️ Database

**Default**: SQLite (`lets_evaluate.db` in the project root) — zero configuration, perfect for local use and small teams.

**To use PostgreSQL** (production / team use):
```env
DATABASE_URL=postgresql://user:password@localhost:5432/lets_evaluate
```
Install the driver: `pip install psycopg2-binary`

**Recommended database for this app**: SQLite for solo/small use; **PostgreSQL** (via [Supabase](https://supabase.com) free tier or [Railway](https://railway.app)) for production.

---

## 🤖 AI Model Recommendation

This app uses **OpenAI GPT-4o-mini** — the best balance of cost, speed, and quality for:
- Resume parsing & tech stack analysis
- Tailored interview question generation
- Structured JSON output reliability

**Why GPT-4o-mini?**
- ~95% as capable as GPT-4o for structured text tasks
- 10× cheaper per token vs GPT-4o
- Fast enough for real-time interaction

To switch to a more powerful model, edit `utils/ai_utils.py`:
```python
return ChatOpenAI(model="gpt-4o", ...)  # More capable, higher cost
```

---

## 🌐 Deployment Options (Free, Lifetime)

### ☁️ Option 1 — Streamlit Community Cloud ⭐ Recommended
1. Push repo to GitHub
2. Go to <https://share.streamlit.io>
3. Connect repo, set `app.py` as main file
4. Add secrets in the Streamlit Cloud dashboard (same keys as `.env`)
5. Deploy — **free forever** with public repos

> Set `DATABASE_URL` to a Supabase PostgreSQL URL for persistent cloud storage.

### 🚂 Option 2 — Railway
1. Create account at <https://railway.app>
2. New Project → Deploy from GitHub
3. Add environment variables in the Railway dashboard
4. Add a PostgreSQL plugin for the database
5. Free starter plan available

### 🎨 Option 3 — Render
1. Create account at <https://render.com>
2. New Web Service → connect GitHub repo
3. Build command: `pip install -r requirements.txt`
4. Start command: `streamlit run app.py --server.port $PORT --server.address 0.0.0.0`
5. Free tier available (spins down after inactivity)

### 🐳 Option 4 — Docker (self-hosted)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8501
CMD ["streamlit", "run", "app.py", "--server.address", "0.0.0.0"]
```

---

## 📁 Project Structure

```
lets-evaluate/
├── app.py                         # Landing page (animated workflow)
├── requirements.txt
├── .env.example                   # Environment variable template
├── .streamlit/
│   └── config.toml                # Theme & upload size config
├── pages/
│   ├── 1_Auth.py                  # Login / Register / Forgot Password
│   ├── 2_Dashboard.py             # Stats & quick navigation
│   ├── 3_Projects.py              # Projects CRUD
│   ├── 4_Roles.py                 # Roles CRUD
│   ├── 5_Questions.py             # Questions CRUD
│   ├── 6_Evaluate_Candidate.py    # 4-step AI evaluation wizard
│   └── 7_Archives.py              # Evaluation archive + PDF download
└── utils/
    ├── database.py                # SQLAlchemy models & CRUD helpers
    ├── auth.py                    # bcrypt auth + session helpers
    ├── email_utils.py             # SMTP email (Gmail/Outlook/Yahoo)
    ├── ai_utils.py                # OpenAI/LangChain integration
    └── pdf_utils.py               # ReportLab PDF generation
```

---

## 🏗️ Architecture

The diagram below shows how the different layers of **Let's Evaluate** interact at runtime.

```mermaid
flowchart TB
    User(["👤 User\n(Browser)"])

    subgraph Streamlit["⚡ Streamlit Application"]
        Landing["app.py\n🏠 Landing Page"]

        subgraph Pages["📄 Pages Layer"]
            Auth["1_Auth.py\n🔐 Authentication"]
            Dash["2_Dashboard.py\n📊 Dashboard"]
            Proj["3_Projects.py\n📁 Projects"]
            Roles["4_Roles.py\n👥 Roles"]
            Ques["5_Questions.py\n❓ Questions"]
            Eval["6_Evaluate_Candidate.py\n🤖 AI Evaluation"]
            Arch["7_Archives.py\n📂 Archives"]
        end

        subgraph Utils["🔧 Utils Layer"]
            DB["database.py\nSQLAlchemy ORM"]
            AuthUtil["auth.py\nbcrypt hashing"]
            EmailUtil["email_utils.py\nSMTP client"]
            AIUtil["ai_utils.py\nLangChain / OpenAI"]
            PDFUtil["pdf_utils.py\nReportLab PDF"]
        end
    end

    subgraph External["☁️ External Services"]
        OpenAI["🤖 OpenAI\nGPT-4o-mini"]
        SMTP["📧 SMTP Server\nGmail / Outlook / Yahoo"]
        DataStore[("🗄️ Database\nSQLite  /  PostgreSQL")]
    end

    User -->|HTTP| Landing
    Landing --> Pages
    Auth --> AuthUtil
    Auth --> EmailUtil
    Dash --> DB
    Proj --> DB
    Roles --> DB
    Ques --> DB
    Eval --> DB
    Eval --> AIUtil
    Eval --> PDFUtil
    Arch --> DB
    Arch --> PDFUtil

    DB --> DataStore
    EmailUtil --> SMTP
    AIUtil --> OpenAI
```

### Layer responsibilities

| Layer | Files | Responsibility |
|---|---|---|
| **Entry point** | `app.py` | Animated landing page, session bootstrap |
| **Pages** | `pages/1_Auth.py` … `pages/7_Archives.py` | One Streamlit page per feature; owns all UI logic |
| **Utils** | `utils/database.py` | SQLAlchemy models, all CRUD helpers |
| **Utils** | `utils/auth.py` | bcrypt password hashing & session management |
| **Utils** | `utils/email_utils.py` | SMTP email dispatch (password-reset codes) |
| **Utils** | `utils/ai_utils.py` | LangChain chains — resume parsing, question generation |
| **Utils** | `utils/pdf_utils.py` | ReportLab evaluation report generator |
| **External** | OpenAI API | GPT-4o-mini completions for AI features |
| **External** | SMTP provider | Transactional email delivery |
| **External** | SQLite / PostgreSQL | Persistent data storage |

---

## 📦 Dependencies

| Library | Purpose |
|---|---|
| `streamlit` | Web UI framework |
| `pdfplumber` | PDF resume text extraction |
| `langchain` + `langchain-openai` | LLM orchestration |
| `openai` | GPT-4o-mini API |
| `faiss-cpu` + `tiktoken` | Token management & vector search |
| `sqlalchemy` | Database ORM |
| `bcrypt` | Password hashing |
| `reportlab` | PDF report generation |
| `python-dotenv` | Environment variable loading |

---

## 🔒 Security Notes

- Passwords are hashed with **bcrypt** (never stored in plain text)
- Password reset codes **expire after 15 minutes** and are single-use
- API keys are loaded from environment variables, never hardcoded
- The SQLite database file is excluded from version control via `.gitignore`

---

## 📄 Pages Overview

### Landing Page (`/`)
Animated workflow showcase with gradient hero, feature cards, and "Start Evaluate" CTA.

### Authentication (`/1_Auth`)
- **Left panel**: Sign In with email/password
- **Right panel**: Create Account
- **Forgot Password**: Two-step flow — enter email → receive 6-digit code → set new password

### Dashboard (`/2_Dashboard`)
Stats cards (Projects / Roles / Questions / Evaluations) + quick-access navigation + recent evaluations table.

### Projects (`/3_Projects`)
Grid of project cards with tech stack chips. Add/Edit/Delete with "type Delete to confirm" guard. Linked roles & questions are shown in the confirmation message.

### Roles (`/4_Roles`)
Same as Projects. Roles can be linked to a project (optional). Delete shows linked questions.

### Questions (`/5_Questions`)
Filterable question bank (by role, category, difficulty). Questions can be linked to roles.

### Evaluate Candidate (`/6_Evaluate_Candidate`)
**4-step wizard:**
1. Select project + role, enter candidate details, upload resume (PDF/DOCX)
2. AI analysis — tech match score, experience level, strengths, concerns, recommendation
3. Generate standard questions (AI) + resume-based questions (AI)
4. Add evaluator notes, set status, submit

### Archives (`/7_Archives`)
Full evaluation history with filters. Update status per evaluation (Pending / Selected / Rejected / Hold). Download evaluation as a professional PDF.

---

## 🖼️ UI Screenshots

Click any slide below to expand it.

> 📷 **Want to contribute screenshots?**  
> Run the app locally, capture each page, and save the files in [`docs/screenshots/`](docs/screenshots/) following the naming guide in that folder's README.

---

<details>
<summary><strong>🏠 Slide 1 — Landing Page</strong></summary>

![Landing Page](docs/screenshots/01_landing.png)

**What you see:** Animated gradient hero banner, workflow step-cards (Upload → Analyse → Evaluate → Archive), a prominent *"Start Evaluate"* call-to-action button, and a feature-highlights grid at the bottom.

</details>

---

<details>
<summary><strong>🔐 Slide 2 — Authentication</strong></summary>

![Authentication – Sign In](docs/screenshots/02_auth_login.png)

**Sign In tab (left panel):** Email + password fields with a *Sign In* button.  
**Create Account tab (right panel):** Full name, email, and password registration form.  
**Forgot Password:** Two-step flow — enter your email address → receive a 6-digit passcode → set a new password.

</details>

---

<details>
<summary><strong>📊 Slide 3 — Dashboard</strong></summary>

![Dashboard](docs/screenshots/03_dashboard.png)

**What you see:** Four KPI cards (Projects · Roles · Questions · Evaluations), quick-navigation shortcut buttons to every page, and a *Recent Evaluations* data table with status badges.

</details>

---

<details>
<summary><strong>📁 Slide 4 — Projects</strong></summary>

![Projects](docs/screenshots/04_projects.png)

**What you see:** Grid of project cards, each showing the project name, description, and tech-stack chips. Top-right *Add Project* button opens an inline form. Each card has **Edit** and **Delete** actions; deletion requires typing `Delete` to confirm.

</details>

---

<details>
<summary><strong>👥 Slide 5 — Roles</strong></summary>

![Roles](docs/screenshots/05_roles.png)

**What you see:** Same card-grid layout as Projects. Each role card shows the linked project (if any). Deleting a role that has linked questions displays a warning listing them.

</details>

---

<details>
<summary><strong>❓ Slide 6 — Questions</strong></summary>

![Questions](docs/screenshots/06_questions.png)

**What you see:** A searchable, filterable question bank with dropdown filters for *Role*, *Category*, and *Difficulty*. Each question row has inline Edit / Delete controls. *Add Question* button opens an expandable form at the top.

</details>

---

<details>
<summary><strong>🤖 Slide 7 — Evaluate Candidate (Step 1 · Setup)</strong></summary>

![Evaluate – Step 1](docs/screenshots/07_evaluate_step1.png)

**What you see:** Project + role selectors, candidate name / email / years-of-experience inputs, and a drag-and-drop file uploader for the resume (PDF or DOCX). *Analyse Resume* advances to Step 2.

</details>

---

<details>
<summary><strong>🤖 Slide 8 — Evaluate Candidate (Step 2 · AI Analysis)</strong></summary>

![Evaluate – Step 2](docs/screenshots/07_evaluate_step2.png)

**What you see:** AI-generated analysis card with tech-match score gauge, experience-level badge, bulleted strengths and concerns, and an overall recommendation. *Generate Questions* advances to Step 3.

</details>

---

<details>
<summary><strong>🤖 Slide 9 — Evaluate Candidate (Step 3 · Questions)</strong></summary>

![Evaluate – Step 3](docs/screenshots/07_evaluate_step3.png)

**What you see:** Two columns — *Standard Questions* (AI-generated from the role's question bank) and *Resume-Based Questions* (AI-generated from the candidate's resume). Each question has a score input field. *Proceed to Submit* advances to Step 4.

</details>

---

<details>
<summary><strong>🤖 Slide 10 — Evaluate Candidate (Step 4 · Submit)</strong></summary>

![Evaluate – Step 4](docs/screenshots/07_evaluate_step4.png)

**What you see:** Evaluator notes text area, overall status selector (Pending / Selected / Rejected / Hold), score summary, and a *Submit Evaluation* button. Confirmation toast appears on success.

</details>

---

<details>
<summary><strong>📂 Slide 11 — Archives</strong></summary>

![Archives](docs/screenshots/08_archives.png)

**What you see:** Full evaluation history table with filters for date range, project, role, and status. Each row has a *Update Status* dropdown and a *Download PDF* button that generates a formatted evaluation report.

</details>

---

## 🤝 Contributing

Pull requests welcome! Please open an issue first to discuss any significant changes.

---

## 📜 License

MIT
