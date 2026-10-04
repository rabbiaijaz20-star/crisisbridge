"""
ml/pipeline.py

Combines extract.py + duplicate_check.py + priority.py + directory routing
+ first-aid tips into a single function: process_report(). This is what
the backend calls for every incoming report.

Flow:
  raw text -> extract structured data -> check for duplicates
           -> apply priority safety net -> assign department
           -> attach first-aid or AI safety tip -> final case
"""

import uuid

from extract import extract_report
from duplicate_check import DuplicateChecker
from priority import apply_priority_safety_net
from directory import get_department_for_incident, get_department_info
from first_aid_tips import get_first_aid_tip, get_ai_safety_tip

_duplicate_checker = DuplicateChecker()


def process_report(raw_text: str) -> dict:
    report_id = str(uuid.uuid4())[:8]

    case = extract_report(raw_text)

    duplicate_result = _duplicate_checker.check_duplicate(raw_text)
    case["is_duplicate"] = duplicate_result is not None
    case["duplicate_of"] = duplicate_result["matched_report_id"] if duplicate_result else None
    case["duplicate_similarity"] = duplicate_result["similarity"] if duplicate_result else None

    if not case["is_duplicate"]:
        _duplicate_checker.add_report(report_id, raw_text)

    case = apply_priority_safety_net(case)

    # Route to the correct department (the "bridge")
    department_key = get_department_for_incident(case["incident_type"])
    case["department"] = department_key
    case["department_info"] = get_department_info(department_key)

    # Fixed, verified first-aid tip for minor injuries. If nothing matches,
    # fall back to an AI-generated general safety tip (e.g. gas leaks).
    first_aid = get_first_aid_tip(raw_text)
    if not first_aid:
        first_aid = get_ai_safety_tip(raw_text, case["incident_type"])
    case["first_aid_tip"] = first_aid

    case["report_id"] = report_id
    return case


if __name__ == "__main__":
    import json

    test_reports = [
        "There are around 10 people trapped in this area and they need drinking water and medical assistance",
        "10 people trapped here, need water urgently",
        "میرے علاقے میں سیلاب آ گیا ہے، گھر میں پانی داخل ہو رہا ہے",
        "Woman is unconscious after the flood, needs immediate help",
        "Mera hath jal gaya hai",
        "gas leak ho raha hai ghar mein",
    ]

    for text in test_reports:
        result = process_report(text)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print("-" * 60)