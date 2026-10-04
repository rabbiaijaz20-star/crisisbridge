"""
ml/duplicate_check.py

Detects when a new report is likely describing the same incident as an
existing one, even if worded completely differently (or in a different
language - English/Urdu/Roman Urdu are all supported by the multilingual
embedding model below).

How it works:
1. Every report's text gets converted into a vector (embedding) that
   captures its meaning, not just its exact words.
2. New reports are compared against recently stored ones using cosine
   similarity.
3. If similarity is above the threshold, it's flagged as a likely
   duplicate for a human coordinator to confirm - never auto-merged.
"""

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

# Multilingual model - handles English, Urdu, and Roman Urdu reasonably well
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
EMBEDDING_DIM = 384  # this model's output size

DUPLICATE_THRESHOLD = 0.82  # tune this after testing on real reports


class DuplicateChecker:
    def __init__(self):
        self.model = SentenceTransformer(MODEL_NAME)
        self.index = faiss.IndexFlatIP(EMBEDDING_DIM)
        self.report_store = []

    def _embed(self, text: str) -> np.ndarray:
        vec = self.model.encode([text], normalize_embeddings=True)
        return vec.astype("float32")

    def check_duplicate(self, text: str):
        if self.index.ntotal == 0:
            return None

        query_vec = self._embed(text)
        scores, indices = self.index.search(query_vec, k=1)

        best_score = float(scores[0][0])
        best_idx = int(indices[0][0])

        if best_score >= DUPLICATE_THRESHOLD:
            return {
                "matched_report_id": self.report_store[best_idx]["report_id"],
                "matched_text": self.report_store[best_idx]["text"],
                "similarity": round(best_score, 3),
            }
        return None

    def add_report(self, report_id: str, text: str):
        vec = self._embed(text)
        self.index.add(vec)
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