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
| 💾 Save Draft | Auto-save & resume evaluation progress at any step |
| 📂 Archives | Browse past evaluations, update status, download PDF reports |
| 🔒 Privacy Policy | Transparent data usage and privacy information |
| 📋 Terms & Conditions | Usage terms and acceptable use policy |

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
OPENAI_API_KEY=your_openai_api_key_here

# ── Email (SMTP) ───────────────────────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here   # NOT your regular password — see below
EMAIL_FROM=your_email@gmail.com

# ── App ────────────────────────────────────────────────────────────────────────
APP_SECRET_KEY=your_secret_key_here_change_this
DATABASE_URL=sqlite:///./lets_evaluate.db
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
The PostgreSQL driver (`psycopg2-binary`) is already included in `requirements.txt` — no extra install needed.

**Recommended database for this app**: SQLite for solo/small use; **PostgreSQL** (via [Supabase](https://supabase.com) free tier or [Railway](https://railway.app)) for production.

### ⚠️ Data Persistence Warning — Cloud Deployments

> **If you deployed this app to a cloud platform and lost all your data, this section explains why.**

Most free-tier cloud platforms use **ephemeral (temporary) filesystems**.  
Every time the app container restarts — which happens after periods of inactivity on Render, Streamlit Community Cloud, Railway, and similar platforms — the local SQLite file is **permanently deleted**, taking all your data with it.

| Platform | Behaviour | Safe with SQLite? |
|---|---|---|
| Local machine | File persists on disk | ✅ Yes |
| Streamlit Community Cloud | Container restarts on redeploy / inactivity | ❌ No |
| Render free tier | Spins down after 15 min inactivity, fresh container on restart | ❌ No |
| Railway ephemeral deploy | No persistent volume by default | ❌ No |
| VPS / dedicated server | File persists as long as disk exists | ✅ Yes (with backups) |

**How to prevent data loss — use a persistent PostgreSQL database:**

1. Create a **free** PostgreSQL instance on [Supabase](https://supabase.com) or [Railway](https://railway.app)  
2. Copy the connection string they provide  
3. Set it as your `DATABASE_URL`:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

On **Streamlit Community Cloud**, add it under *App settings → Secrets*:
```toml
DATABASE_URL = "postgresql://user:password@host:5432/dbname"
```

Once `DATABASE_URL` points to PostgreSQL, data survives all restarts and periods of inactivity.

> The app will also show a **⚠️ warning banner** in the sidebar whenever it detects a SQLite database, reminding you to switch before you lose data.

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
├── runtime.txt                    # Python version pin (python-3.12)
├── .env.example                   # Environment variable template
├── .streamlit/
│   └── config.toml                # Theme & upload size config
├── pages/
│   ├── 1_Auth.py                  # Login / Register / Forgot Password
│   ├── 2_Dashboard.py             # Stats & quick navigation
│   ├── 3_Projects.py              # Projects CRUD
│   ├── 4_Roles.py                 # Roles CRUD
│   ├── 5_Questions.py             # Questions CRUD
│   ├── 6_Evaluate_Candidate.py    # 4-step AI evaluation wizard (with draft save)
│   ├── 7_Archives.py              # Evaluation archive + PDF download
│   ├── 8_Privacy_Policy.py        # Privacy policy page
│   └── 9_Terms_Conditions.py      # Terms & conditions page
└── utils/
    ├── database.py                # SQLAlchemy models & CRUD helpers
    ├── auth.py                    # bcrypt auth + session helpers
    ├── email_utils.py             # SMTP email (Gmail/Outlook/Yahoo)
    ├── ai_utils.py                # OpenAI/LangChain integration
    ├── pdf_utils.py               # ReportLab PDF generation
    └── ui.py                      # Shared UI components (logo, sidebar, CSS)
```

---

## 📦 Dependencies

| Library | Purpose |
|---|---|
| `streamlit` | Web UI framework |
| `langchain` + `langchain-openai` + `langchain-core` | LLM orchestration |
| `openai` | GPT-4o-mini API |
| `sqlalchemy` | Database ORM |
| `bcrypt` | Password hashing |
| `reportlab` | PDF report generation |
| `pillow` | Image processing (logo/favicon) |
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

**Save Draft**: Progress is saved automatically at any step via the 💾 Save Progress button. Drafts can be resumed from the Dashboard or by returning to the page with the `draft_id` query parameter.

### Archives (`/7_Archives`)
Full evaluation history with filters. Update status per evaluation (Pending / Selected / Rejected / Hold). Download evaluation as a professional PDF.

### Privacy Policy (`/8_Privacy_Policy`)
Describes what data is collected, how it is used, stored, and protected. Accessible to both authenticated and unauthenticated users.

### Terms & Conditions (`/9_Terms_Conditions`)
Outlines the acceptable use policy, user responsibilities, and limitations of liability. Accessible to both authenticated and unauthenticated users.

---

## 🤝 Contributing

Pull requests welcome! Please open an issue first to discuss any significant changes.

---

## 📜 License

MIT
