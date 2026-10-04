# CrisisBridge AI 🚨

**AI-powered disaster reporting and relief-coordination platform** — built for Pak Angels Cohort 11 Hackathon (iCodeGuru × Aspire Pakistan × HEC × NCEAC) by team **Build Smart Pakistan**.

CrisisBridge AI turns scattered emergency reports (accidents, fires, building collapses, medical and resource needs) into organized, AI-prioritized cases that responders and relief organizations can act on quickly — in English, Urdu, or Roman Urdu.

---

## 🌟 Features

- **AI Emergency Chatbot** — describe an emergency in your own words; the AI identifies the incident type, urgency, and required help
- **Smart Prioritization** — reports are automatically ranked Critical / High / Medium / Low
- **Duplicate Detection** — FAISS + sentence-transformers catch repeated reports of the same incident
- **Blood Bank Finder** — location-based search (OpenStreetMap Overpass API) for nearby blood banks and hospitals, with progressively widening radius and a national fallback
- **First Aid Guidance** — instant step-by-step first aid tips for common emergencies (burns, gas leaks, electric shock, CPR)
- **Food, Water & Shelter Coordination** — connects requests to relief partners: **Hello Future Technologies**, **Edhi Foundation**, and **Alkhidmat Foundation**
- **Per-Person Rate Limiting** — prevents one person from repeatedly claiming the same resource within 24 hours, so help reaches more people fairly
- **Responder Dashboard** — track, accept, and update the status of every case (New → Resolved)
- **AI Situation Summary** — one-click overview of the current emergency landscape

---

## 🛠️ Tech Stack

**Backend:** FastAPI (Python), Groq LLM (`openai/gpt-oss-20b`), FAISS, Sentence-Transformers, SQLite, OpenStreetMap Overpass API

**Frontend:** React + Vite, React-Leaflet, Axios

---

## 🚀 Running Locally

### Backend

cd backend
pip install -r requirements.txt

Create a `.env` file inside `backend/` with:

GROQ_API_KEY=your_groq_api_key_here

Run the server:

python -m uvicorn main:app --reload --port 8000

Backend will be live at `http://127.0.0.1:8000`

### Frontend

cd frontend
npm install
npm run dev

Create a `.env` file inside `frontend/` with (only needed for deployment; defaults to localhost otherwise):

VITE_API_URL=http://127.0.0.1:8000

Frontend will be live at `http://localhost:5173`

---

## 👥 Team

**Build Smart Pakistan** — Pak Angels Cohort 11 Hackathon
Group Leader: Rabbia

---

## 🤝 Relief Partners

- **Hello Future Technologies (Pvt) Ltd** — resource coordination partner
- **Edhi Foundation** — national welfare network
- **Alkhidmat Foundation** — national welfare network

---

## 📄 License

Built for educational/hackathon purposes.
