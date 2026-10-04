"""
backend/database.py
"""

import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "crisisbridge.db")


def init_db():
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                report_id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
    finally:
        conn.close()


def save_report(case: dict):
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            "INSERT OR REPLACE INTO reports (report_id, data) VALUES (?, ?)",
            (case["report_id"], json.dumps(case, ensure_ascii=False))
        )
        conn.commit()
    finally:
        conn.close()


def get_all_reports():
    conn = sqlite3.connect(DB_PATH)
    try:
        rows = conn.execute("SELECT data FROM reports ORDER BY created_at DESC").fetchall()
        return [json.loads(row[0]) for row in rows]
    finally:
        conn.close()


def get_report_by_id(report_id: str):
    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute("SELECT data FROM reports WHERE report_id = ?", (report_id,)).fetchone()
        return json.loads(row[0]) if row else None
    finally:
        conn.close()


def update_report_status(report_id: str, new_status: str):
    case = get_report_by_id(report_id)
    if not case:
        return None
    case["status"] = new_status
    save_report(case)
    return case


def accept_report(report_id: str, responder_name: str):
    case = get_report_by_id(report_id)
    if not case:
        return None
    case["status"] = "assistance_assigned"
    case["accepted_by"] = responder_name
    save_report(case)
    return case