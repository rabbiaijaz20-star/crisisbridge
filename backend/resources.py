"""
backend/resources.py
Stores available resources and matches them against a report's needs.
"""

import sqlite3
import json
import os
import uuid

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "crisisbridge.db")


def init_resources_table():
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS resources (
                resource_id TEXT PRIMARY KEY,
                resource_type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                location_text TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
    finally:
        conn.close()


def add_resource(resource_type: str, quantity: int, location_text: str = None):
    resource_id = str(uuid.uuid4())[:8]
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            "INSERT INTO resources (resource_id, resource_type, quantity, location_text) VALUES (?, ?, ?, ?)",
            (resource_id, resource_type, quantity, location_text)
        )
        conn.commit()
    finally:
        conn.close()
    return resource_id


def get_all_resources():
    conn = sqlite3.connect(DB_PATH)
    try:
        rows = conn.execute("SELECT resource_id, resource_type, quantity, location_text FROM resources").fetchall()
        return [
            {"resource_id": r[0], "resource_type": r[1], "quantity": r[2], "location_text": r[3]}
            for r in rows
        ]
    finally:
        conn.close()


def match_resources_to_report(needs: list):
    """Returns all resources whose type matches any of the report's needs."""
    all_res = get_all_resources()
    return [r for r in all_res if r["resource_type"] in needs]