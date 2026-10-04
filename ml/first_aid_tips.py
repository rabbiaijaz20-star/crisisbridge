import os
from groq import Groq

DEMO_DISCLAIMER = "Demo Data — Replace with verified official contacts before deployment."

FIRST_AID_TIPS = {
    "burn": {
        "tip": "Run cool (not ice-cold) water over the burn for 10-20 minutes. Do not apply ice, butter, or toothpaste. Cover loosely with a clean cloth."
    },
    "cut": {
        "tip": "Apply firm, direct pressure on the wound with a clean cloth. Elevate the injured area if possible. If bleeding does not stop after 10 minutes, seek medical help."
    },
    "bleeding": {
        "tip": "Apply firm pressure with a clean cloth directly on the wound. Elevate the injured part above heart level if possible. Do not remove the cloth if it soaks through — add more on top."
    },
    "fracture": {
        "tip": "Do not move or straighten the injured limb. Support it in the position found using a splint or rolled cloth. Get medical help immediately."
    },
    "choking": {
        "tip": "If the person can cough, encourage coughing. If they cannot breathe or speak, give firm back blows between the shoulder blades, followed by abdominal thrusts (Heimlich maneuver)."
    },
    "fainting": {
        "tip": "Lay the person flat and raise their legs slightly. Loosen tight clothing. Ensure fresh air. If they do not regain consciousness within a minute, call for emergency help."
    },
    "electric_shock": {
        "tip": "Do not touch the person directly if they are still in contact with the electrical source. Turn off the power at the switch or breaker first. Once safe, check breathing — if absent, begin CPR. Get emergency medical help immediately."
    },
    "gas_leak": {
        "tip": "Do not turn on/off any electrical switches or light a flame. Open doors and windows immediately for ventilation. Evacuate everyone from the area. Call the gas emergency service or 1122 once safely outside."
    },
    "cpr": {
        "tip": "Check if the person is responsive and breathing. If not breathing normally, call for emergency help immediately. Push hard and fast in the center of the chest (about 100-120 compressions per minute) until help arrives or the person responds."
    },
}

KEYWORD_MAP = {
    "burn": "burn", "jal": "burn", "jala": "burn", "jali": "burn",
    "cut": "cut", "zakhm": "cut",
    "bleed": "bleeding", "khoon": "bleeding", "khun": "bleeding",
    "fracture": "fracture", "broken": "fracture", "toot": "fracture",
    "choking": "choking", "gala": "choking",
    "faint": "fainting", "unconscious": "fainting", "behosh": "fainting",
    "electric": "electric_shock", "shock": "electric_shock", "socket": "electric_shock", "current": "electric_shock", "bijli": "electric_shock",
    "gas": "gas_leak", "leak": "gas_leak",
    "cpr": "cpr", "breathing": "cpr", "saans": "cpr",
}


def get_first_aid_tip(report_text: str):
    text_lower = report_text.lower()
    for keyword, category in KEYWORD_MAP.items():
        if keyword in text_lower:
            return FIRST_AID_TIPS[category]
    return None


def get_ai_safety_tip(report_text: str, incident_type: str):
    try:
        client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        prompt = f"""A person reported this emergency: "{report_text}"
Incident type: {incident_type}

Give 2-3 short, safe first-aid steps (under 40 words total) for this situation.
If there is no safe first-aid advice to give (e.g. this is not a medical/safety situation), reply with exactly: NONE"""
        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=300,
        )
        text = response.choices[0].message.content.strip()
        if not text or text.upper() == "NONE":
            return None
        return {"tip": text}
    except Exception:
        return None