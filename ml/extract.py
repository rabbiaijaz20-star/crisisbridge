"""
ml/extract.py

Turns a raw emergency report (text, any language - English/Urdu/Roman Urdu)
into a structured JSON case using Groq.
"""

import json
import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

INCIDENT_TYPES = [
    "flooding", "fire", "earthquake", "building_collapse",
    "medical_emergency", "trapped_people", "road_blocked", "other"
]

NEEDS_TYPES = [
    "drinking_water", "medical_assistance", "food", "shelter",
    "rescue", "transportation", "clothing", "other"
]

URGENCY_LEVELS = ["critical", "high", "medium", "low"]

EXTRACTION_PROMPT = """You are an emergency report analyzer for a disaster relief platform.
Read the report below (it may be in English, Urdu, or Roman Urdu) and extract
structured information.

Report: "{text}"

Return ONLY valid JSON in exactly this shape, nothing else - no explanation,
no markdown formatting, no code fences:

{{
  "incident_type": one of {incident_types},
  "location_text": "the location as mentioned in the report, or null if not mentioned",
  "affected_people": number of people affected, or null if not mentioned,
  "needs": array of any of {needs_types},
  "urgency": one of {urgency_levels},
  "language_detected": "en" or "ur" or "roman_ur",
  "summary": "one short plain-English sentence summarizing the report"
}}

Rules for urgency:
- "critical": trapped people, life-threatening injury, someone not breathing/unconscious
- "high": injuries, active danger (fire/collapsing structure), urgent medical need
- "medium": property damage, blocked roads, non-urgent supply needs
- "low": general information, minor issues

If the report doesn't clearly describe an emergency, set incident_type to "other"
and urgency to "low"."""


def extract_report(text: str) -> dict:
    prompt = EXTRACTION_PROMPT.format(
        text=text,
        incident_types=INCIDENT_TYPES,
        needs_types=NEEDS_TYPES,
        urgency_levels=URGENCY_LEVELS,
    )

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        max_tokens=1024,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content.strip()

    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = raw.replace("json\n", "", 1)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise ValueError(f"Model did not return valid JSON:\n{raw}")

    data["original_text"] = text
    return data


if __name__ == "__main__":
    test_reports = [
        "There are around 10 people trapped in this area and they need drinking water and medical assistance",
        "میرے علاقے میں سیلاب آ گیا ہے، گھر میں پانی داخل ہو رہا ہے",
        "Sarak band hai, log phasay huay hain madad chahiye",
    ]

    for r in test_reports:
        print("REPORT:", r)
        try:
            result = extract_report(r)
            print(json.dumps(result, ensure_ascii=False, indent=2))
        except Exception as e:
            print("ERROR:", e)
        print("-" * 50)