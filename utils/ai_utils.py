import os
import json
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
  "summary": "<2-3 sentence summary>",
  "certifications": ["<certification name>", ...],
  "career_history": [
    {{
      "title": "<job title>",
      "company": "<company name>",
      "start": "<start date, e.g. Jan 2020>",
      "end": "<end date or Present>",
      "is_current": <true|false>,
      "duration": "<e.g. 2 years 3 months>"
    }}
  ],
  "total_experience_mentioned": "<years/months the candidate stated, or Unknown>",
  "total_experience_calculated": "<total calculated from career history, e.g. 5 years 2 months>",
  "is_currently_employed": <true|false>,
  "current_employer": "<current employer name or empty string>"
}}

Notes:
- tech_comparison must include ALL technologies from the Required Tech Stack with their match status.
- career_history must be sorted chronologically from OLDEST to NEWEST entry.
- certifications should be an empty list if none found in the resume."""

        response = llm.invoke(prompt)
        result = _parse_json_response(response.content)
        # Ensure required keys exist with safe defaults
        result.setdefault("tech_comparison", [
            {"technology": t, "status": "Matched" if t in result.get("matched_technologies", []) else "Unmatched"}
            for t in project_tech_stack
        ])
        result.setdefault("certifications", [])
        result.setdefault("career_history", [])
        result.setdefault("total_experience_mentioned", "Unknown")
        result.setdefault("total_experience_calculated", "Unknown")
        result.setdefault("is_currently_employed", False)
        result.setdefault("current_employer", "")
        return result
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
        prompt = f"""You are an expert technical interviewer. Generate {num_questions} interview questions for a {role_name} position.
Tech stack: {", ".join(tech_stack)}

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
        prompt = f"""You are an expert HR professional. Refine and improve the following candidate evaluation notes to be clear, professional, and well-structured. Keep the core content and sentiment but improve formatting, grammar, and clarity. Use bullet points where appropriate. Return only the refined text without any additional explanation or preamble.

Evaluation notes:
{notes[:_MAX_NOTES_CHARS]}"""

        response = llm.invoke(prompt)
        return response.content.strip()
    except Exception:
        return notes
