"""
ml/directory.py

Demo emergency directory. All entries are placeholder/demo data.
In real deployment, replace with verified official contacts from
1122, Rescue 1122, PDMA, and Police via their official APIs.
"""

DEMO_DISCLAIMER = "Demo Data — Replace with verified official contacts before deployment."

DEPARTMENTS = {
    "first_aid": {
        "name": "First Aid Department (Demo)",
        "service_type": "Medical / First Aid",
        "emergency_number": "1122",
        "website": "https://example.com/first-aid-demo",
        "area_served": "Bahawalpur (demo)",
        "last_verified": "2026-09-27",
        "active": True,
        "note": DEMO_DISCLAIMER,
    },
    "fire": {
        "name": "Fire Emergency Department (Demo)",
        "service_type": "Fire & Rescue",
        "emergency_number": "16",
        "website": "https://example.com/fire-demo",
        "area_served": "Bahawalpur (demo)",
        "last_verified": "2026-09-27",
        "active": True,
        "note": DEMO_DISCLAIMER,
    },
    "disaster": {
        "name": "Flood / Disaster Management Department (Demo)",
        "service_type": "Disaster Response (PDMA-style)",
        "emergency_number": "1129",
        "website": "https://example.com/pdma-demo",
        "area_served": "Punjab (demo)",
        "last_verified": "2026-09-27",
        "active": True,
        "note": DEMO_DISCLAIMER,
    },
    "police": {
        "name": "Police Help Department (Demo)",
        "service_type": "Police / Law Enforcement",
        "emergency_number": "15",
        "website": "https://example.com/police-demo",
        "area_served": "Bahawalpur (demo)",
        "last_verified": "2026-09-27",
        "active": True,
        "note": DEMO_DISCLAIMER,
    },
}

INCIDENT_TO_DEPARTMENT = {
    "fire": "fire",
    "flooding": "disaster",
    "earthquake": "disaster",
    "building_collapse": "disaster",
    "trapped_people": "disaster",
    "road_blocked": "police",
    "medical_emergency": "first_aid",
    "other": "first_aid",
}


def get_department_for_incident(incident_type: str) -> str:
    return INCIDENT_TO_DEPARTMENT.get(incident_type, "first_aid")


def get_department_info(department_key: str) -> dict:
    return DEPARTMENTS.get(department_key, DEPARTMENTS["first_aid"])


def get_all_departments() -> dict:
    return DEPARTMENTS