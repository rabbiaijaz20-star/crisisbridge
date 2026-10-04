"""
ml/summary.py
Generates a plain-language overview of all current reports using Groq.
"""

import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


def generate_situation_summary(reports: list) -> str:
    if not reports:
        return "No reports received yet."

    lines = []
    for r in reports:
        lines.append(
            f"- {r['incident_type']} ({r['final_priority']}), status: {r.get('status', 'new')}, "
            f"needs: {', '.join(r['needs']) if r['needs'] else 'none'}"
        )
    reports_text = "\n".join(lines)

    prompt = f"""You are summarizing the current disaster relief situation for a coordinator.
Here are all reports received so far:

{reports_text}

Write a short 2-3 sentence plain-English summary covering: total reports,
the most common incident type, how many are critical/high priority, and
how many are still pending (not resolved)."""

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
         max_tokens=800,
    )
    return response.choices[0].message.content.strip()