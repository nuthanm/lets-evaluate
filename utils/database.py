import uuid
import json
import os
import socket
import tempfile
import threading
import warnings
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs, unquote_plus
from sqlalchemy import (
    create_engine, Column, String, Boolean, DateTime,
    Text, ForeignKey, text as sa_text, inspect as sa_inspect,
)
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker, Session
from dotenv import load_dotenv

try:
    import psycopg2
    _psycopg2_available = True
except ImportError:
    _psycopg2_available = False

load_dotenv()

# Default to a writable temp directory so the app starts on read-only
# filesystems (e.g. Streamlit Cloud mounts the repo at /mount/src/… which
# is read-only, causing SQLite to fail when ./lets_evaluate.db is used).
_default_sqlite_path = os.path.join(tempfile.gettempdir(), "lets_evaluate.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_default_sqlite_path}")
# SQLAlchemy 2.0+ dropped the legacy 'postgres://' dialect alias.
# Many cloud platforms (Heroku, Streamlit Cloud, Neon, Supabase…) still
# issue connection strings that start with 'postgres://', so normalise them
# to 'postgresql://' to avoid an OperationalError on startup.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
# Redirect SQLite paths that are not writable to the temp directory.
# On Streamlit Cloud the repo is mounted read-only at /mount/src/…, so both
# relative paths (e.g. sqlite:///lets_evaluate.db) and absolute paths that
# point into a non-writable or non-existent directory (e.g. a local absolute
# path copied into Streamlit Cloud secrets) raise an OperationalError when
# SQLAlchemy tries to create/open the file.
if DATABASE_URL.startswith("sqlite:///"):
    # Strip whitespace to guard against whitespace-only paths.
    _sqlite_path = DATABASE_URL[len("sqlite:///"):].strip()
    if _sqlite_path and not os.path.isabs(_sqlite_path):
        # Relative paths: redirect to the writable temp directory.
        # rstrip('/') ensures basename extracts the filename even for
        # paths like 'foo/' or 'sub/dir/'.
        _sqlite_filename = os.path.basename(_sqlite_path.rstrip("/")) or "lets_evaluate.db"
        DATABASE_URL = f"sqlite:///{os.path.join(tempfile.gettempdir(), _sqlite_filename)}"
    elif _sqlite_path and os.path.isabs(_sqlite_path):
        # Absolute paths: redirect to the temp directory when the parent
        # directory does not exist or is not writable (e.g. a local absolute
        # path copied into Streamlit Cloud secrets where the path either
        # doesn't exist on the container or points to the read-only repo
        # mount at /mount/src/…).
        _sqlite_dir = os.path.dirname(_sqlite_path)
        if not os.access(_sqlite_dir, os.W_OK):
            _sqlite_filename = os.path.basename(_sqlite_path) or "lets_evaluate.db"
            DATABASE_URL = f"sqlite:///{os.path.join(tempfile.gettempdir(), _sqlite_filename)}"

# Engine and session factory are created lazily on first use to avoid
# import-time failures (e.g. KeyError from SQLAlchemy's dialect registry
# when the module is loaded before the Streamlit runtime is fully ready).
# A lock ensures thread-safe initialization in Streamlit's multi-threaded env.
_engine = None
_SessionLocal = None
_db_lock = threading.Lock()


def _make_ipv4_creator(db_url: str):
    """Return a psycopg2 connection creator that forces an IPv4 connection.

    Some cloud platforms (e.g. Supabase) publish both IPv4 and IPv6 DNS
    records, but certain deployment environments (e.g. Streamlit Community
    Cloud) can only route IPv4.  When Python's default DNS resolution picks
    an IPv6 address the connection fails with "Cannot assign requested
    address".

    Setting the ``hostaddr`` libpq parameter to the resolved IPv4 address
    tells libpq to dial that address directly while ``host`` is still kept
    for SSL hostname verification.  If IPv4 resolution fails the function
    falls back to the default DNS behaviour so legitimate IPv6-only setups
    continue to work.
    """
    parsed = urlparse(db_url)

    # Build psycopg2 keyword arguments from the URL.
    connect_kwargs = {}
    if parsed.hostname:
        connect_kwargs["host"] = parsed.hostname
    if parsed.port:
        connect_kwargs["port"] = parsed.port
    if parsed.username:
        connect_kwargs["user"] = unquote_plus(parsed.username)
    if parsed.password:
        connect_kwargs["password"] = unquote_plus(parsed.password)
    if parsed.path and len(parsed.path) > 1:
        connect_kwargs["dbname"] = parsed.path.lstrip("/")
    # Forward any query-string parameters (e.g. sslmode=require).
    for key, values in parse_qs(parsed.query).items():
        connect_kwargs[key] = values[0]

    def creator():
        kw = dict(connect_kwargs)
        host = kw.get("host", "")
        if host:
            try:
                infos = socket.getaddrinfo(
                    host,
                    kw.get("port", 5432),
                    family=socket.AF_INET,
                    type=socket.SOCK_STREAM,
                )
                if infos:
                    # Pass the IPv4 address via hostaddr so libpq skips DNS
                    # and dials it directly; host is kept for SNI/SSL checks.
                    kw["hostaddr"] = infos[0][4][0]
            except socket.gaierror as exc:
                warnings.warn(
                    f"IPv4 DNS lookup for '{host}' failed ({exc}); "
                    "falling back to default address resolution — "
                    "this may cause connection issues on IPv4-only hosts.",
                    RuntimeWarning,
                    stacklevel=2,
                )
        return psycopg2.connect(**kw)

    return creator


def _get_engine():
    global _engine
    if _engine is None:
        with _db_lock:
            if _engine is None:
                _is_pg = DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgresql+psycopg2://")
                if _is_pg and _psycopg2_available:
                    # Use a custom creator that forces IPv4 to avoid failures
                    # on IPv4-only hosts when the server's DNS publishes an
                    # IPv6 address (e.g. Supabase on Streamlit Community Cloud).
                    _engine = create_engine(
                        DATABASE_URL,
                        creator=_make_ipv4_creator(DATABASE_URL),
                    )
                else:
                    _engine = create_engine(
                        DATABASE_URL,
                        connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
                    )
    return _engine


def _get_session_factory():
    global _SessionLocal
    if _SessionLocal is None:
        with _db_lock:
            if _SessionLocal is None:
                _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_get_engine())
    return _SessionLocal


class Base(DeclarativeBase):
    pass


def _new_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_new_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    roles = relationship("Role", back_populates="user", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="user", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="user", cascade="all, delete-orphan")
    password_resets = relationship("PasswordReset", back_populates="user", cascade="all, delete-orphan")
    drafts = relationship("EvaluationDraft", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=_new_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    tech_stack = Column(Text, default="[]")  # JSON list stored as text
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="projects")
    roles = relationship("Role", back_populates="project")
    evaluations = relationship("Evaluation", back_populates="project")


class Role(Base):
    __tablename__ = "roles"

    id = Column(String, primary_key=True, default=_new_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    requirements = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="roles")
    project = relationship("Project", back_populates="roles")
    questions = relationship("Question", back_populates="role")
    evaluations = relationship("Evaluation", back_populates="role")


class Question(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True, default=_new_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    role_id = Column(String, ForeignKey("roles.id"), nullable=True, index=True)
    question_text = Column(Text, nullable=False)
    category = Column(String, default="Technical")  # Technical/Behavioral/Situational/Process
    difficulty = Column(String, default="Medium")   # Easy/Medium/Hard
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="questions")
    role = relationship("Role", back_populates="questions")


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(String, primary_key=True, default=_new_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    role_id = Column(String, ForeignKey("roles.id"), nullable=True)
    candidate_name = Column(String, nullable=False)
    candidate_email = Column(String, default="")
    resume_filename = Column(String, default="")
    initial_metrics = Column(Text, default="{}")   # JSON
    standard_questions = Column(Text, default="[]")  # JSON
    resume_questions = Column(Text, default="[]")    # JSON
    role_questions = Column(Text, default="[]")      # JSON
    q_satisfaction = Column(Text, default="{}")      # JSON
    comments = Column(Text, default="")
    status = Column(String, default="Pending")  # Pending/Selected/Shortlisted/Rejected/Hold/Cancelled
    interviewer_name = Column(String, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="evaluations")
    project = relationship("Project", back_populates="evaluations")
    role = relationship("Role", back_populates="evaluations")


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id = Column(String, primary_key=True, default=_new_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    passcode = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)

    user = relationship("User", back_populates="password_resets")


class EvaluationDraft(Base):
    __tablename__ = "evaluation_drafts"

    id = Column(String, primary_key=True, default=_new_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    role_id = Column(String, ForeignKey("roles.id"), nullable=True)
    candidate_name = Column(String, default="")
    step = Column(String, default="1")         # current step when saved
    eval_data = Column(Text, default="{}")     # JSON snapshot of all eval_* session-state keys
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="drafts")
    project = relationship("Project")
    role = relationship("Role")


# ---------------------------------------------------------------------------
# DB session helper
# ---------------------------------------------------------------------------

def get_db() -> Session:
    return _get_session_factory()()


def init_db():
    Base.metadata.create_all(bind=_get_engine())
    # Migrate: add any columns that may be missing from older databases.
    # Uses SQLAlchemy's Inspector for dialect-agnostic column discovery so
    # this works for both SQLite and PostgreSQL.
    # PostgreSQL supports ADD COLUMN IF NOT EXISTS (v9.6+); SQLite lacks that
    # clause, but the pre-check against existing_cols guards against duplicates.
    # SQL strings are fully static (no interpolation) to avoid any risk of
    # SQL injection from dynamically constructed DDL.
    try:
        engine = _get_engine()
        inspector = sa_inspect(engine)
        existing_cols = {c["name"] for c in inspector.get_columns("evaluations")}
        is_postgres = engine.dialect.name == "postgresql"
        # Each entry: (column_name, postgresql_ddl, other_ddl)
        migrations = [
            (
                "interviewer_name",
                "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS interviewer_name VARCHAR DEFAULT ''",
                "ALTER TABLE evaluations ADD COLUMN interviewer_name VARCHAR DEFAULT ''",
            ),
            (
                "role_questions",
                "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS role_questions TEXT DEFAULT '[]'",
                "ALTER TABLE evaluations ADD COLUMN role_questions TEXT DEFAULT '[]'",
            ),
            (
                "q_satisfaction",
                "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS q_satisfaction TEXT DEFAULT '{}'",
                "ALTER TABLE evaluations ADD COLUMN q_satisfaction TEXT DEFAULT '{}'",
            ),
        ]
        with engine.begin() as conn:
            for col_name, pg_sql, other_sql in migrations:
                if col_name not in existing_cols:
                    conn.execute(sa_text(pg_sql if is_postgres else other_sql))
    except Exception:
        pass


# ---------------------------------------------------------------------------
# CRUD helpers — Users
# ---------------------------------------------------------------------------

def get_user_by_email(email: str) -> dict | None:
    db = get_db()
    try:
        user = db.query(User).filter(User.email == email.lower().strip()).first()
        if user is None:
            return None
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "password_hash": user.password_hash,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "created_at": user.created_at,
        }
    finally:
        db.close()


def create_user(email: str, name: str, password_hash: str) -> dict:
    db = get_db()
    try:
        user = User(
            id=_new_uuid(),
            email=email.lower().strip(),
            name=name.strip(),
            password_hash=password_hash,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return {"id": user.id, "email": user.email, "name": user.name}
    finally:
        db.close()


def update_user_password(user_id: str, new_hash: str):
    db = get_db()
    try:
        db.query(User).filter(User.id == user_id).update({"password_hash": new_hash})
        db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# CRUD helpers — Projects
# ---------------------------------------------------------------------------

def get_projects_for_user(user_id: str) -> list[dict]:
    db = get_db()
    try:
        projects = db.query(Project).filter(Project.user_id == user_id).order_by(Project.created_at.desc()).all()
        return [
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "tech_stack": json.loads(p.tech_stack or "[]"),
                "created_at": p.created_at,
                "updated_at": p.updated_at,
            }
            for p in projects
        ]
    finally:
        db.close()


def create_project(user_id: str, name: str, description: str, tech_stack: list) -> dict:
    db = get_db()
    try:
        project = Project(
            id=_new_uuid(),
            user_id=user_id,
            name=name,
            description=description,
            tech_stack=json.dumps(tech_stack),
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return {"id": project.id, "name": project.name}
    finally:
        db.close()


def update_project(project_id: str, name: str, description: str, tech_stack: list):
    db = get_db()
    try:
        db.query(Project).filter(Project.id == project_id).update({
            "name": name,
            "description": description,
            "tech_stack": json.dumps(tech_stack),
            "updated_at": datetime.now(timezone.utc),
        })
        db.commit()
    finally:
        db.close()


def delete_project(project_id: str):
    db = get_db()
    try:
        db.query(Project).filter(Project.id == project_id).delete()
        db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# CRUD helpers — Roles
# ---------------------------------------------------------------------------

def get_roles_for_user(user_id: str) -> list[dict]:
    db = get_db()
    try:
        roles = (
            db.query(Role, Project.name.label("project_name"))
            .outerjoin(Project, Role.project_id == Project.id)
            .filter(Role.user_id == user_id)
            .order_by(Role.created_at.desc())
            .all()
        )
        return [
            {
                "id": r.Role.id,
                "name": r.Role.name,
                "description": r.Role.description,
                "requirements": r.Role.requirements,
                "project_id": r.Role.project_id,
                "project_name": r.project_name,
                "created_at": r.Role.created_at,
                "updated_at": r.Role.updated_at,
            }
            for r in roles
        ]
    finally:
        db.close()


def get_roles_for_project(project_id: str) -> list[dict]:
    db = get_db()
    try:
        roles = db.query(Role).filter(Role.project_id == project_id).all()
        return [{"id": r.id, "name": r.name, "description": r.description, "requirements": r.requirements} for r in roles]
    finally:
        db.close()


def create_role(user_id: str, name: str, description: str, requirements: str, project_id: str | None = None) -> dict:
    db = get_db()
    try:
        role = Role(
            id=_new_uuid(),
            user_id=user_id,
            name=name,
            description=description,
            requirements=requirements,
            project_id=project_id or None,
        )
        db.add(role)
        db.commit()
        db.refresh(role)
        return {"id": role.id, "name": role.name}
    finally:
        db.close()


def update_role(role_id: str, name: str, description: str, requirements: str, project_id: str | None = None):
    db = get_db()
    try:
        db.query(Role).filter(Role.id == role_id).update({
            "name": name,
            "description": description,
            "requirements": requirements,
            "project_id": project_id or None,
            "updated_at": datetime.now(timezone.utc),
        })
        db.commit()
    finally:
        db.close()


def delete_role(role_id: str):
    db = get_db()
    try:
        db.query(Role).filter(Role.id == role_id).delete()
        db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# CRUD helpers — Questions
# ---------------------------------------------------------------------------

def get_questions_for_user(user_id: str) -> list[dict]:
    db = get_db()
    try:
        questions = (
            db.query(Question, Role.name.label("role_name"))
            .outerjoin(Role, Question.role_id == Role.id)
            .filter(Question.user_id == user_id)
            .order_by(Question.created_at.desc())
            .all()
        )
        return [
            {
                "id": q.Question.id,
                "question_text": q.Question.question_text,
                "category": q.Question.category,
                "difficulty": q.Question.difficulty,
                "role_id": q.Question.role_id,
                "role_name": q.role_name,
                "created_at": q.Question.created_at,
                "updated_at": q.Question.updated_at,
            }
            for q in questions
        ]
    finally:
        db.close()


def get_questions_for_role(role_id: str) -> list[dict]:
    db = get_db()
    try:
        questions = db.query(Question).filter(Question.role_id == role_id).all()
        return [
            {
                "id": q.id,
                "question_text": q.question_text,
                "category": q.category,
                "difficulty": q.difficulty,
            }
            for q in questions
        ]
    finally:
        db.close()


def create_question(user_id: str, question_text: str, category: str, difficulty: str, role_id: str | None = None) -> dict:
    db = get_db()
    try:
        question = Question(
            id=_new_uuid(),
            user_id=user_id,
            question_text=question_text,
            category=category,
            difficulty=difficulty,
            role_id=role_id or None,
        )
        db.add(question)
        db.commit()
        db.refresh(question)
        return {"id": question.id}
    finally:
        db.close()


def update_question(question_id: str, question_text: str, category: str, difficulty: str, role_id: str | None = None):
    db = get_db()
    try:
        db.query(Question).filter(Question.id == question_id).update({
            "question_text": question_text,
            "category": category,
            "difficulty": difficulty,
            "role_id": role_id or None,
            "updated_at": datetime.now(timezone.utc),
        })
        db.commit()
    finally:
        db.close()


def delete_question(question_id: str):
    db = get_db()
    try:
        db.query(Question).filter(Question.id == question_id).delete()
        db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# CRUD helpers — Evaluations
# ---------------------------------------------------------------------------

def get_evaluations_for_user(user_id: str) -> list[dict]:
    db = get_db()
    try:
        rows = (
            db.query(
                Evaluation,
                Project.name.label("project_name"),
                Role.name.label("role_name"),
            )
            .outerjoin(Project, Evaluation.project_id == Project.id)
            .outerjoin(Role, Evaluation.role_id == Role.id)
            .filter(Evaluation.user_id == user_id)
            .order_by(Evaluation.created_at.desc())
            .all()
        )
        return [
            {
                "id": r.Evaluation.id,
                "candidate_name": r.Evaluation.candidate_name,
                "candidate_email": r.Evaluation.candidate_email,
                "resume_filename": r.Evaluation.resume_filename,
                "project_id": r.Evaluation.project_id,
                "project_name": r.project_name,
                "role_id": r.Evaluation.role_id,
                "role_name": r.role_name,
                "initial_metrics": json.loads(r.Evaluation.initial_metrics or "{}"),
                "standard_questions": json.loads(r.Evaluation.standard_questions or "[]"),
                "resume_questions": json.loads(r.Evaluation.resume_questions or "[]"),
                "role_questions": json.loads(r.Evaluation.role_questions or "[]"),
                "q_satisfaction": json.loads(r.Evaluation.q_satisfaction or "{}"),
                "comments": r.Evaluation.comments,
                "status": r.Evaluation.status,
                "interviewer_name": r.Evaluation.interviewer_name or "",
                "created_at": r.Evaluation.created_at,
                "updated_at": r.Evaluation.updated_at,
            }
            for r in rows
        ]
    finally:
        db.close()


def get_evaluation_by_id(evaluation_id: str) -> dict | None:
    db = get_db()
    try:
        row = (
            db.query(
                Evaluation,
                Project.name.label("project_name"),
                Role.name.label("role_name"),
            )
            .outerjoin(Project, Evaluation.project_id == Project.id)
            .outerjoin(Role, Evaluation.role_id == Role.id)
            .filter(Evaluation.id == evaluation_id)
            .first()
        )
        if row is None:
            return None
        return {
            "id": row.Evaluation.id,
            "candidate_name": row.Evaluation.candidate_name,
            "candidate_email": row.Evaluation.candidate_email,
            "resume_filename": row.Evaluation.resume_filename,
            "project_id": row.Evaluation.project_id,
            "project_name": row.project_name,
            "role_id": row.Evaluation.role_id,
            "role_name": row.role_name,
            "initial_metrics": json.loads(row.Evaluation.initial_metrics or "{}"),
            "standard_questions": json.loads(row.Evaluation.standard_questions or "[]"),
            "resume_questions": json.loads(row.Evaluation.resume_questions or "[]"),
            "role_questions": json.loads(row.Evaluation.role_questions or "[]"),
            "q_satisfaction": json.loads(row.Evaluation.q_satisfaction or "{}"),
            "comments": row.Evaluation.comments,
            "status": row.Evaluation.status,
            "interviewer_name": row.Evaluation.interviewer_name or "",
            "created_at": row.Evaluation.created_at,
            "updated_at": row.Evaluation.updated_at,
        }
    finally:
        db.close()


def create_evaluation(
    user_id: str,
    candidate_name: str,
    candidate_email: str,
    resume_filename: str,
    project_id: str | None,
    role_id: str | None,
    initial_metrics: dict,
    standard_questions: list,
    resume_questions: list,
    comments: str,
    status: str = "Pending",
    interviewer_name: str = "",
    role_questions: list | None = None,
    q_satisfaction: dict | None = None,
) -> dict:
    db = get_db()
    try:
        ev = Evaluation(
            id=_new_uuid(),
            user_id=user_id,
            candidate_name=candidate_name,
            candidate_email=candidate_email,
            resume_filename=resume_filename,
            project_id=project_id or None,
            role_id=role_id or None,
            initial_metrics=json.dumps(initial_metrics),
            standard_questions=json.dumps(standard_questions),
            resume_questions=json.dumps(resume_questions),
            role_questions=json.dumps(role_questions or []),
            q_satisfaction=json.dumps(q_satisfaction or {}),
            comments=comments,
            status=status,
            interviewer_name=interviewer_name,
        )
        db.add(ev)
        db.commit()
        db.refresh(ev)
        return {"id": ev.id}
    finally:
        db.close()


def update_evaluation(evaluation_id: str, **kwargs):
    db = get_db()
    try:
        update_data = {}
        for key, value in kwargs.items():
            if key in ("initial_metrics",):
                update_data[key] = json.dumps(value)
            elif key in ("standard_questions", "resume_questions", "role_questions", "q_satisfaction"):
                update_data[key] = json.dumps(value)
            else:
                update_data[key] = value
        update_data["updated_at"] = datetime.now(timezone.utc)
        db.query(Evaluation).filter(Evaluation.id == evaluation_id).update(update_data)
        db.commit()
    finally:
        db.close()


def delete_evaluation(evaluation_id: str):
    db = get_db()
    try:
        db.query(Evaluation).filter(Evaluation.id == evaluation_id).delete()
        db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# CRUD helpers — Password Resets
# ---------------------------------------------------------------------------

def create_password_reset(user_id: str, passcode: str, expires_at: datetime) -> dict:
    db = get_db()
    try:
        reset = PasswordReset(
            id=_new_uuid(),
            user_id=user_id,
            passcode=passcode,
            expires_at=expires_at,
            used=False,
        )
        db.add(reset)
        db.commit()
        return {"id": reset.id}
    finally:
        db.close()


def get_valid_reset(user_id: str, passcode: str) -> dict | None:
    db = get_db()
    try:
        reset = (
            db.query(PasswordReset)
            .filter(
                PasswordReset.user_id == user_id,
                PasswordReset.passcode == passcode,
                PasswordReset.used.is_(False),
                PasswordReset.expires_at > datetime.now(timezone.utc),
            )
            .first()
        )
        if reset is None:
            return None
        return {"id": reset.id, "user_id": reset.user_id, "passcode": reset.passcode}
    finally:
        db.close()


def mark_reset_used(reset_id: str):
    db = get_db()
    try:
        db.query(PasswordReset).filter(PasswordReset.id == reset_id).update({"used": True})
        db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# CRUD helpers — Evaluation Drafts
# ---------------------------------------------------------------------------

def get_drafts_for_user(user_id: str) -> list[dict]:
    db = get_db()
    try:
        rows = (
            db.query(
                EvaluationDraft,
                Project.name.label("project_name"),
                Role.name.label("role_name"),
            )
            .outerjoin(Project, EvaluationDraft.project_id == Project.id)
            .outerjoin(Role, EvaluationDraft.role_id == Role.id)
            .filter(EvaluationDraft.user_id == user_id)
            .order_by(EvaluationDraft.updated_at.desc())
            .all()
        )
        return [
            {
                "id": r.EvaluationDraft.id,
                "candidate_name": r.EvaluationDraft.candidate_name,
                "project_id": r.EvaluationDraft.project_id,
                "project_name": r.project_name or "—",
                "role_id": r.EvaluationDraft.role_id,
                "role_name": r.role_name or "—",
                "step": r.EvaluationDraft.step,
                "eval_data": json.loads(r.EvaluationDraft.eval_data or "{}"),
                "created_at": r.EvaluationDraft.created_at,
                "updated_at": r.EvaluationDraft.updated_at,
            }
            for r in rows
        ]
    finally:
        db.close()


def create_draft(
    user_id: str,
    candidate_name: str,
    project_id: str | None,
    role_id: str | None,
    step: str,
    eval_data: dict,
) -> dict:
    db = get_db()
    try:
        draft = EvaluationDraft(
            id=_new_uuid(),
            user_id=user_id,
            candidate_name=candidate_name,
            project_id=project_id or None,
            role_id=role_id or None,
            step=step,
            eval_data=json.dumps(eval_data),
        )
        db.add(draft)
        db.commit()
        db.refresh(draft)
        return {"id": draft.id}
    finally:
        db.close()


def update_draft(draft_id: str, candidate_name: str, project_id: str | None, role_id: str | None, step: str, eval_data: dict):
    db = get_db()
    try:
        db.query(EvaluationDraft).filter(EvaluationDraft.id == draft_id).update({
            "candidate_name": candidate_name,
            "project_id": project_id or None,
            "role_id": role_id or None,
            "step": step,
            "eval_data": json.dumps(eval_data),
            "updated_at": datetime.now(timezone.utc),
        })
        db.commit()
    finally:
        db.close()


def delete_draft(draft_id: str):
    db = get_db()
    try:
        db.query(EvaluationDraft).filter(EvaluationDraft.id == draft_id).delete()
        db.commit()
    finally:
        db.close()
