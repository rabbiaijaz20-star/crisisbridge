"""
ml/priority.py

Adds a rule-based safety net on top of the LLM's urgency classification
(from extract.py). This layer can only UPGRADE priority, never downgrade -
so if the LLM ever misjudges a genuinely critical report, a hard keyword
rule still catches it and flags it for immediate coordinator attention.

This exists specifically because of the safety principle: AI should never
be the sole decision-maker for what counts as critical.
"""

PRIORITY_ORDER = {"low": 0, "medium": 1, "high": 2, "critical": 3}

# Keywords that ALWAYS force critical priority, regardless of what the
# LLM assigned. Covers English, Urdu, and Roman Urdu.
CRITICAL_OVERRIDE_KEYWORDS = [
    "unconscious", "not breathing", "no pulse", "dying", "drowning",
    "بے ہوش", "سانس نہیں", "ڈوب رہا", "مر رہا",
    "behoosh", "sans nahi", "dub raha", "marne wala",
]

# Keywords that force at least HIGH priority if the LLM assigned lower
HIGH_OVERRIDE_KEYWORDS = [
    "trapped", "collapsed", "on fire", "severe bleeding",
    "پھنسے", "آگ لگی", "شدید زخمی",
    "phanse", "aag lagi", "shadeed zakhmi",
]


def apply_priority_safety_net(report: dict) -> dict:
    """
    Takes an extracted report (output of extract.py's extract_report)
    and returns it with a final_priority field added.

    - ai_priority: what the LLM assigned (kept for transparency)
    - final_priority: after the rule-based safety net is applied
    - priority_overridden: True if the rule net upgraded it
    """
    text = report.get("original_text", "").lower()
    ai_priority = report.get("urgency", "low")

    final_priority = ai_priority

    if any(keyword in text for keyword in CRITICAL_OVERRIDE_KEYWORDS):
        final_priority = "critical"
    elif any(keyword in text for keyword in HIGH_OVERRIDE_KEYWORDS):
        if PRIORITY_ORDER[ai_priority] < PRIORITY_ORDER["high"]:
            final_priority = "high"

    report["ai_priority"] = ai_priority
    report["final_priority"] = final_priority
    report["priority_overridden"] = (final_priority != ai_priority)

    return report


if __name__ == "__main__":
    # Simulate a report the LLM under-classified, to prove the safety net works
    test_report = {
        "original_text": "Woman is unconscious, please send help",
        "urgency": "medium",  # pretend the LLM got this wrong
        "incident_type": "medical_emergency",
    }

    result = apply_priority_safety_net(test_report)
    print("AI priority:", result["ai_priority"])
    print("Final priority:", result["final_priority"])
    print("Was overridden:", result["priority_overridden"])