import os
import json
from dotenv import load_dotenv

load_dotenv()

_OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")

# Token-limit guards for LLM prompts
_MAX_RESUME_CHARS = 4000      # ~1 000 tokens — keeps cost low while retaining key detail
_MAX_ROLE_REQ_CHARS = 2000    # role requirements excerpt
_MAX_RESUME_RESUME_CHARS = 3000  # shorter excerpt for resume-based Q generation


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
            "strengths": [],
            "concerns": ["OpenAI API key not configured"],
            "recommendation": "Hold",
            "summary": "OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.",
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
  "strengths": ["<strength>", ...],
  "concerns": ["<concern>", ...],
  "recommendation": "<Proceed|Hold|Reject>",
  "summary": "<2-3 sentence summary>"
}}"""

        response = llm.invoke(prompt)
        result = _parse_json_response(response.content)
        return result
    except Exception as exc:
        return {
            "tech_match_score": 0,
            "experience_level": "Unknown",
            "matched_technologies": [],
            "missing_technologies": [],
            "strengths": [],
            "concerns": [f"AI analysis failed: {exc}"],
            "recommendation": "Hold",
            "summary": f"Analysis could not be completed: {exc}",
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
