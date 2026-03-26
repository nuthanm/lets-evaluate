import uuid
import json
import os
import threading
from datetime import datetime, timezone
from sqlalchemy import (
    create_engine, Column, String, Boolean, DateTime,
    Text, ForeignKey, text as sa_text,
)
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker, Session
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./lets_evaluate.db")

# Engine and session factory are created lazily on first use to avoid
# import-time failures (e.g. KeyError from SQLAlchemy's dialect registry
# when the module is loaded before the Streamlit runtime is fully ready).
# A lock ensures thread-safe initialization in Streamlit's multi-threaded env.
_engine = None
_SessionLocal = None
_db_lock = threading.Lock()


def _get_engine():
    global _engine
    if _engine is None:
        with _db_lock:
            if _engine is None:
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
    comments = Column(Text, default="")
    status = Column(String, default="Pending")  # Pending/Selected/Shortlisted/Rejected/Hold
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


# ---------------------------------------------------------------------------
# DB session helper
# ---------------------------------------------------------------------------

def get_db() -> Session:
    return _get_session_factory()()


def init_db():
    Base.metadata.create_all(bind=_get_engine())
    # Migrate: add interviewer_name column if it doesn't exist (SQLite)
    try:
        engine = _get_engine()
        with engine.connect() as conn:
            cols = [row[1] for row in conn.execute(
                sa_text("PRAGMA table_info(evaluations)")
            )]
            if "interviewer_name" not in cols:
                conn.execute(sa_text(
                    "ALTER TABLE evaluations ADD COLUMN interviewer_name VARCHAR DEFAULT ''"
                ))
                conn.commit()
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
            elif key in ("standard_questions", "resume_questions"):
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
