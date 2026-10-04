import requests
from math import radians, sin, cos, sqrt, atan2

OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
]
HEADERS = {"User-Agent": "CrisisBridgeAI/1.0 (hackathon project; contact: rabbiak345@gmail.com)"}

RADII_TO_TRY = [20000, 50000, 100000]

NATIONAL_FALLBACK = [{
    "name": "Indus Hospital & Health Network (National — free treatment)",
    "phone": "+92-21-35112709",
    "lat": None,
    "lon": None,
    "distance_km": None,
    "type": "National free hospital network",
}]


def find_nearby_blood_banks(lat: float, lon: float, limit: int = 5):
    for radius_m in RADII_TO_TRY:
        results = _query_combined(lat, lon, radius_m)
        if results is None:
            # All Overpass mirrors failed/timed out — stop retrying, go straight to fallback
            return NATIONAL_FALLBACK
        if results:
            results.sort(key=lambda x: x["distance_km"])
            return results[:limit]
    return NATIONAL_FALLBACK


def _query_combined(lat, lon, radius_m):
    """One combined query per radius: blood banks + hospitals together, to minimize calls."""
    query = f"""
    [out:json][timeout:20];
    (
      node["healthcare"="blood_donation"](around:{radius_m},{lat},{lon});
      node["amenity"="blood_bank"](around:{radius_m},{lat},{lon});
      node["healthcare"="blood_bank"](around:{radius_m},{lat},{lon});
      node["amenity"="hospital"](around:{radius_m},{lat},{lon});
      way["amenity"="hospital"](around:{radius_m},{lat},{lon});
    );
    out center;
    """
    data = _run_with_mirrors(query)
    if data is None:
        return None  # signal: all mirrors failed

    blood_results = []
    hospital_results = []
    for element in data.get("elements", []):
        tags = element.get("tags", {})
        is_blood = tags.get("amenity") == "blood_bank" or tags.get("healthcare") in ("blood_donation", "blood_bank")
        tag_label = "Blood Bank" if is_blood else "Hospital (may offer blood services)"

        name = tags.get("name", f"Unnamed {tag_label}")
        phone = tags.get("phone") or tags.get("contact:phone") or "Not available"
        el_lat = element.get("lat") or (element.get("center") or {}).get("lat")
        el_lon = element.get("lon") or (element.get("center") or {}).get("lon")
        if el_lat is None or el_lon is None:
            continue

        entry = {
            "name": name,
            "phone": phone,
            "lat": el_lat,
            "lon": el_lon,
            "distance_km": round(_haversine(lat, lon, el_lat, el_lon), 1),
            "type": tag_label,
        }
        (blood_results if is_blood else hospital_results).append(entry)

    return blood_results if blood_results else hospital_results


def _run_with_mirrors(query):
    for url in OVERPASS_MIRRORS:
        try:
            response = requests.post(url, data={"data": query}, headers=HEADERS, timeout=20)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Overpass mirror failed ({url}):", e)
            continue
    return None  # every mirror failed


def _haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c