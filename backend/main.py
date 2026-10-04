"""
backend/main.py
"""

import os
import sys
from typing import Optional
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from rate_limiter import is_rate_limited

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "ml"))
from pipeline import process_report  # noqa: E402
from summary import generate_situation_summary  # noqa: E402
from database import init_db, save_report, get_all_reports, get_report_by_id, update_report_status, accept_report  # noqa: E402
from resources import init_resources_table, add_resource, get_all_resources, match_resources_to_report  # noqa: E402
from directory import get_all_departments  # noqa: E402
from blood_bank_finder import find_nearby_blood_banks  # noqa: E402

app = FastAPI(title="CrisisBridge AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()
init_resources_table()

_groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

VALID_STATUSES = ["new", "under_review", "assistance_assigned", "in_progress", "resolved"]


class ReportIn(BaseModel):
    text: str
    phone: str
    lat: float | None = None
    lng: float | None = None


class ResourceInput(BaseModel):
    resource_type: str
    quantity: int
    location_text: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str


class AcceptInput(BaseModel):
    responder_name: str


class ChatInput(BaseModel):
    message: str
    history: list = []


@app.post("/reports")
def submit_report(report: ReportIn):
    if not report.phone or not report.phone.strip():
        return {"blocked": True, "message": "Phone number zaroori hai."}

    case = process_report(report.text)
    case["lat"] = report.lat
    case["lng"] = report.lng
    case["phone"] = report.phone
    case["status"] = "new"
    case["accepted_by"] = None

    for need in case.get("needs", []):
        if is_rate_limited(report.phone, need):
            return {
                "blocked": True,
                "message": f"Aap ne '{need}' ke liye pehle bhi 24 ghante mein request ki hui hai. Resources dusron tak bhi pohanchne chahiye — agar zaroorat shadeed hai to seedha 1122 ya helpline par call karein."
            }

    save_report(case)
    return case


@app.get("/reports")
def list_reports():
    return get_all_reports()


@app.get("/reports/{report_id}")
def get_report(report_id: str):
    result = get_report_by_id(report_id)
    return result if result else {"error": "Report not found"}


@app.patch("/reports/{report_id}/status")
def set_status(report_id: str, update: StatusUpdate):
    if update.status not in VALID_STATUSES:
        return {"error": f"Invalid status. Must be one of: {VALID_STATUSES}"}
    result = update_report_status(report_id, update.status)
    return result if result else {"error": "Report not found"}


@app.patch("/reports/{report_id}/accept")
def accept(report_id: str, body: AcceptInput):
    result = accept_report(report_id, body.responder_name)
    return result if result else {"error": "Report not found"}


@app.get("/reports/{report_id}/matches")
def get_matches(report_id: str):
    report = get_report_by_id(report_id)
    if not report:
        return {"error": "Report not found"}
    return match_resources_to_report(report["needs"])


@app.post("/resources")
def submit_resource(resource: ResourceInput):
    resource_id = add_resource(resource.resource_type, resource.quantity, resource.location_text)
    return {"resource_id": resource_id}


@app.get("/resources")
def list_resources():
    return get_all_resources()


@app.get("/summary")
def situation_summary():
    reports = get_all_reports()
    return {"summary": generate_situation_summary(reports)}


@app.get("/directory")
def directory():
    return get_all_departments()


@app.get("/blood-banks")
def get_blood_banks(lat: float, lon: float):
    banks = find_nearby_blood_banks(lat, lon)
    if not banks:
        return {
            "found": False,
            "banks": [],
            "message": "Qareeb koi blood bank database mein nahi mila. Qareeb ke hospital ya 1122 se rabta karein."
        }
    return {"found": True, "banks": banks}


@app.post("/chat")
def chat(body: ChatInput):
    system_prompt = """You are CrisisBridge AI's assistant chatbot, helping someone during an
emergency in Pakistan. Reply in the SAME language/style the user writes in
(English, Urdu script, or Roman Urdu). Be warm, brief, and genuinely helpful.
Answer whatever they ask - first aid questions, what to do next, follow-up
questions - naturally, like a real conversation. If they describe a new
emergency, acknowledge it and say the case is being logged and routed."""

    messages = [{"role": "system", "content": system_prompt}]
    for h in body.history[-6:]:
        messages.append({"role": h["role"], "content": h["text"]})
    messages.append({"role": "user", "content": body.message})

    response = _groq_client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=messages,
        temperature=0.4,
        max_tokens=300,
    )
    return {"reply": response.choices[0].message.content.strip()}


@app.get("/health")
def health():
    return {"status": "ok"}