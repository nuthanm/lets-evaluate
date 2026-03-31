import os
import re
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

_OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")

# Token-limit guards for LLM prompts
_MAX_RESUME_CHARS = 4000      # ~1 000 tokens — keeps cost low while retaining key detail
_MAX_ROLE_REQ_CHARS = 2000    # role requirements excerpt
_MAX_RESUME_RESUME_CHARS = 3000  # shorter excerpt for resume-based Q generation
_MAX_NOTES_CHARS = 2000       # evaluation notes excerpt for AI refinement


def _get_llm():
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(model="gpt-4o-mini", temperature=0.7, openai_api_key=_OPENAI_KEY)


def _is_configured() -> bool:
    key = os.getenv("OPENAI_API_KEY", "")
    # Accept any key that looks like a real OpenAI key (starts with "sk-")
    return bool(key and key.startswith("sk-"))


def _parse_json_response(text: str) -> dict | list:
    text = text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()
    return json.loads(text)


_UNKNOWN_LITERALS = {"unknown", "n/a", "-", "none", ""}


def _is_unknown(value: str) -> bool:
    """Return True if a string value represents a missing / unknown entry."""
    return (value or "").strip().lower() in _UNKNOWN_LITERALS


def _parse_date(s: str) -> datetime | None:
    """Parse a human-readable date string into a datetime (day=1)."""
    if not s:
        return None
    s = s.strip().lower()
    if _is_unknown(s):
        return None
    if s == "present":
        return datetime.now()
    _MONTH_MAP = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    }
    # "Jan 2020" / "January 2020"
    parts = s.split()
    if len(parts) == 2:
        mk = parts[0][:3]
        if mk in _MONTH_MAP:
            try:
                return datetime(int(parts[1]), _MONTH_MAP[mk], 1)
            except ValueError:
                pass
    # "2020"
    if re.fullmatch(r"\d{4}", s):
        return datetime(int(s), 1, 1)
    # "2020-01" or "01/2020"
    m = re.match(r"(\d{4})[/-](\d{1,2})", s) or re.match(r"(\d{1,2})[/-](\d{4})", s)
    if m:
        try:
            g1, g2 = m.group(1), m.group(2)
            year = int(g1) if len(g1) == 4 else int(g2)
            month = int(g2) if len(g1) == 4 else int(g1)
            return datetime(year, month, 1)
        except ValueError:
            pass
    return None


def _calculate_experience_from_history(career_history: list) -> str:
    """Calculate total years/months of experience from career_history dates."""
    now = datetime.now()
    total_months = 0
    for item in career_history:
        start_dt = _parse_date(item.get("start", ""))
        end_raw = (item.get("end", "") or "").strip().lower()
        if end_raw == "present" or item.get("is_current"):
            end_dt = now
        else:
            end_dt = _parse_date(item.get("end", ""))
        if start_dt is None or end_dt is None:
            continue
        if end_dt > start_dt:
            total_months += (end_dt.year - start_dt.year) * 12 + (end_dt.month - start_dt.month)
    if total_months <= 0:
        return ""
    years, months = divmod(total_months, 12)
    if years > 0 and months > 0:
        return f"{years} year{'s' if years != 1 else ''} {months} month{'s' if months != 1 else ''}"
    if years > 0:
        return f"{years} year{'s' if years != 1 else ''}"
    return f"{months} month{'s' if months != 1 else ''}"


def _postprocess_metrics(result: dict, project_tech_stack: list) -> dict:
    """Normalise AI output: clean up 'Unknown' literals, fix counts & score."""
    # ── Normalise career_history ─────────────────────────────────────────────
    cleaned_history = []
    for item in result.get("career_history", []):
        cleaned_history.append({
            "title": item.get("title", "") or "",
            "company": "" if _is_unknown(item.get("company", "")) else (item.get("company") or ""),
            "start": "" if _is_unknown(item.get("start", "")) else (item.get("start") or ""),
            "end": "" if _is_unknown(item.get("end", "")) else (item.get("end") or ""),
            "duration": "" if _is_unknown(item.get("duration", "")) else (item.get("duration") or ""),
            "is_current": bool(item.get("is_current", False)),
        })
    result["career_history"] = cleaned_history

    # ── Normalise current_employer ───────────────────────────────────────────
    employer = result.get("current_employer", "") or ""
    if _is_unknown(employer):
        employer = ""
    if not employer and result.get("is_currently_employed"):
        # Try to extract from career_history
        for item in cleaned_history:
            if item.get("is_current") and item.get("company"):
                employer = item["company"]
                break
    result["current_employer"] = employer

    # ── Auto-detect current employment from career_history ───────────────────
    # Override is_currently_employed if any role has end="present" or is_current=True
    if not result.get("is_currently_employed"):
        for item in cleaned_history:
            end_raw = (item.get("end", "") or "").strip().lower()
            if end_raw == "present" or item.get("is_current"):
                result["is_currently_employed"] = True
                if not employer and item.get("company"):
                    employer = item["company"]
                    result["current_employer"] = employer
                break

    # ── Normalise total_experience_calculated ────────────────────────────────
    calc_exp = result.get("total_experience_calculated", "") or ""
    if _is_unknown(calc_exp) and cleaned_history:
        calc_exp = _calculate_experience_from_history(cleaned_history)
    result["total_experience_calculated"] = "" if _is_unknown(calc_exp) else calc_exp

    # ── Recompute tech_match_score from tech_comparison for consistency ──────
    tc = result.get("tech_comparison", [])
    if tc:
        matched_tc = sum(1 for t in tc if t.get("status") == "Matched")
        result["tech_match_score"] = round((matched_tc / len(tc)) * 100)

    return result


def analyze_resume(
    resume_text: str,
    project_tech_stack: list,
    role_requirements: str,
) -> dict:
    if not _is_configured():
        return {
            "tech_match_score": 0,
            "experience_level": "Unknown",
            "matched_technologies": [],
            "missing_technologies": project_tech_stack,
            "tech_comparison": [{"technology": t, "status": "Unmatched"} for t in project_tech_stack],
            "strengths": [],
            "concerns": ["OpenAI API key not configured"],
            "recommendation": "Hold",
            "summary": "OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.",
            "certifications": [],
            "career_history": [],
            "total_experience_mentioned": "Unknown",
            "total_experience_calculated": "Unknown",
            "is_currently_employed": False,
            "current_employer": "",
        }

    try:
        llm = _get_llm()
        prompt = f"""You are an expert technical recruiter. Analyse the following resume against the job requirements.

Resume:
{resume_text[:_MAX_RESUME_CHARS]}

Required Tech Stack: {", ".join(project_tech_stack)}

Role Requirements:
{role_requirements[:_MAX_ROLE_REQ_CHARS]}

Return ONLY a valid JSON object (no markdown) with exactly these keys:
{{
  "tech_match_score": <integer 0-100>,
  "experience_level": "<Junior|Mid-level|Senior|Lead>",
  "matched_technologies": ["<tech>", ...],
  "missing_technologies": ["<tech>", ...],
  "tech_comparison": [{{"technology": "<tech>", "status": "<Matched|Unmatched>"}}],
  "strengths": ["<strength>", ...],
  "concerns": ["<concern>", ...],
  "recommendation": "<Proceed|Hold|Reject>",
  "summary": "<2-3 sentence summary strictly based on the tech stack comparison above: mention which required technologies are matched (strengths) and which are missing (gaps), plus the experience level. Do NOT invent skills not mentioned in the resume or required tech stack.>",
  "certifications": ["<certification name>", ...],
  "career_history": [
    {{
      "title": "<job title>",
      "company": "<exact company name from resume, or empty string if not stated>",
      "start": "<start date e.g. Jan 2020, or empty string if not stated>",
      "end": "<end date e.g. Mar 2023 or Present, or empty string if not stated>",
      "is_current": <true|false>,
      "duration": "<calculated duration e.g. 2 years 3 months, or empty string if dates unavailable>"
    }}
  ],
  "total_experience_mentioned": "<years/months the candidate explicitly stated, or empty string if not stated>",
  "total_experience_calculated": "<sum of all career_history durations e.g. 8 years 4 months, or empty string if dates are insufficient>",
  "is_currently_employed": <true|false>,
  "current_employer": "<exact current employer name from resume, or empty string if not stated>"
}}

Rules:
- tech_comparison MUST include ALL technologies from the Required Tech Stack — every one must have status "Matched" or "Unmatched".
- matched_technologies and missing_technologies must be consistent with tech_comparison.
- career_history MUST include EVERY position/role mentioned anywhere in the resume — do not skip older or shorter roles.
- career_history must be sorted chronologically from OLDEST to NEWEST entry.
- For each career_history entry, compute duration from start and end dates (round to nearest month).
- total_experience_calculated MUST equal the sum of all career_history durations; compute this carefully.
- Use empty string "" (never the word "Unknown") for any field whose value is not present in the resume.
- certifications should be an empty list if none found in the resume.
- is_current must be true for any role with end date "Present" or described as current."""

        response = llm.invoke(prompt)
        result = _parse_json_response(response.content)
        # Ensure required keys exist with safe defaults
        result.setdefault("tech_comparison", [
            {"technology": t, "status": "Matched" if t in result.get("matched_technologies", []) else "Unmatched"}
            for t in project_tech_stack
        ])
        result.setdefault("certifications", [])
        result.setdefault("career_history", [])
        result.setdefault("total_experience_mentioned", "")
        result.setdefault("total_experience_calculated", "")
        result.setdefault("is_currently_employed", False)
        result.setdefault("current_employer", "")
        return _postprocess_metrics(result, project_tech_stack)
    except Exception as exc:
        return {
            "tech_match_score": 0,
            "experience_level": "Unknown",
            "matched_technologies": [],
            "missing_technologies": [],
            "tech_comparison": [{"technology": t, "status": "Unmatched"} for t in project_tech_stack],
            "strengths": [],
            "concerns": [f"AI analysis failed: {exc}"],
            "recommendation": "Hold",
            "summary": f"Analysis could not be completed: {exc}",
            "certifications": [],
            "career_history": [],
            "total_experience_mentioned": "Unknown",
            "total_experience_calculated": "Unknown",
            "is_currently_employed": False,
            "current_employer": "",
        }


def generate_standard_questions(
    role_name: str,
    tech_stack: list,
    num_questions: int = 10,
    topic: str = "",
) -> list[dict]:
    if not _is_configured():
        return [
            {
                "question": "OpenAI API key not configured. Please set OPENAI_API_KEY.",
                "category": "Technical",
                "expected_answer_hints": "N/A",
            }
        ]

    try:
        llm = _get_llm()
        topic_line = (
            f"\nFocus specifically on the topic: {topic.strip()}"
            if topic.strip() else ""
        )
        prompt = f"""You are an expert technical interviewer. Generate {num_questions} interview questions for a {role_name} position.
Tech stack: {", ".join(tech_stack)}{topic_line}

Return ONLY a valid JSON array (no markdown) where each element has:
{{
  "question": "<question text>",
  "category": "<Technical|Behavioral|Situational|Process>",
  "expected_answer_hints": "<key points to look for>"
}}"""

        response = llm.invoke(prompt)
        result = _parse_json_response(response.content)
        if isinstance(result, list):
            return result
        return []
    except Exception as exc:
        return [{"question": f"Failed to generate questions: {exc}", "category": "Technical", "expected_answer_hints": "N/A"}]


def generate_resume_based_questions(
    resume_text: str,
    role_requirements: str,
    num_questions: int = 10,
) -> list[dict]:
    if not _is_configured():
        return [
            {
                "question": "OpenAI API key not configured. Please set OPENAI_API_KEY.",
                "category": "Technical",
                "expected_answer_hints": "N/A",
            }
        ]

    try:
        llm = _get_llm()
        prompt = f"""You are an expert technical interviewer. Based on this candidate's resume, generate {num_questions} targeted interview questions.

Resume (excerpt):
{resume_text[:_MAX_RESUME_RESUME_CHARS]}

Role Requirements:
{role_requirements[:_MAX_ROLE_REQ_CHARS // 2]}

Return ONLY a valid JSON array (no markdown) where each element has:
{{
  "question": "<question text tailored to this resume>",
  "category": "<Technical|Behavioral|Situational|Process>",
  "expected_answer_hints": "<key points to look for>"
}}"""

        response = llm.invoke(prompt)
        result = _parse_json_response(response.content)
        if isinstance(result, list):
            return result
        return []
    except Exception as exc:
        return [{"question": f"Failed to generate questions: {exc}", "category": "Technical", "expected_answer_hints": "N/A"}]


def refine_evaluation_notes(notes: str) -> str:
    """Use AI to refine and format evaluation notes into clear, professional content."""
    if not _is_configured():
        return notes

    try:
        llm = _get_llm()
        prompt = f"""Act as an interviewer evaluator for giving feedback. Refine and improve the following candidate evaluation notes to be clear, professional, and well-structured. Keep the core content and sentiment but improve formatting, grammar, and clarity. Use bullet points where appropriate. Return only the refined text without any additional explanation or preamble.

Evaluation notes:
{notes[:_MAX_NOTES_CHARS]}"""

        response = llm.invoke(prompt)
        return response.content.strip()
    except Exception:
        return notes
