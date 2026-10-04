"""
ml/duplicate_check.py

Detects when a new report is likely describing the same incident as an
existing one, using lightweight text similarity (no heavy ML models,
so this fits comfortably within Render's free-tier 512MB RAM limit).

How it works:
1. Each report's text is compared against recently stored reports using
   fuzzy string matching (token-based, so word order and minor wording
   differences don't matter much).
2. If similarity is above the threshold, it's flagged as a likely
   duplicate for a human coordinator to confirm - never auto-merged.

Note: this works best when duplicate reports are in the same language
and share overlapping words/phrases. It's less "smart" than embeddings
for cross-language paraphrasing, but catches the vast majority of
real-world duplicates (same person/area reporting the same incident
with similar wording).
"""

from rapidfuzz import fuzz

DUPLICATE_THRESHOLD = 75  # 0-100 scale; tune this after testing on real reports


class DuplicateChecker:
    def __init__(self):
        self.report_store = []

    def check_duplicate(self, text: str):
        if not self.report_store:
            return None

        best_score = -1
        best_match = None

        for report in self.report_store:
            score = fuzz.token_set_ratio(text, report["text"])
            if score > best_score:
                best_score = score
                best_match = report

        if best_score >= DUPLICATE_THRESHOLD:
            return {
                "matched_report_id": best_match["report_id"],
                "matched_text": best_match["text"],
                "similarity": round(best_score / 100, 3),
            }
        return None

    def add_report(self, report_id: str, text: str):
        self.report_store.append({"report_id": report_id, "text": text})


if __name__ == "__main__":
    checker = DuplicateChecker()

    reports = [
        ("r1", "There are around 10 people trapped and need drinking water"),
        ("r2", "میرے علاقے میں سیلاب آ گیا ہے، مدد چاہیے"),
        ("r3", "10 people trapped here, need water urgently"),
        ("r4", "Sarak band hai humein rasta nahi mil raha"),
        ("r5", "flooding in my area, urgent help needed"),
    ]

    for report_id, text in reports:
        print(f"Checking {report_id}: {text}")
        result = checker.check_duplicate(text)
        if result:
            print(f"  -> LIKELY DUPLICATE of {result['matched_report_id']} "
                  f"(similarity: {result['similarity']})")
        else:
            print("  -> New incident, no match found")
        checker.add_report(report_id, text)
        print("-" * 50)