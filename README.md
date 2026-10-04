# CrisisBridge AI

AI-Powered Disaster Information & Relief Coordination Platform

## Overview
CrisisBridge AI collects emergency reports (text/voice/photo/location) during a
disaster, uses AI to extract structured information from each one, flags
duplicates, assigns a priority, and shows everything on a live dashboard and
map for relief coordinators to act on.

## Project Structure
```
crisisbridge-platform/
├── ml/          # AI logic: report extraction, priority scoring, duplicate detection
├── backend/     # FastAPI app - API endpoints, database
├── frontend/    # React dashboard + map
├── data/        # Sample reports, seed data
├── models/      # Saved embeddings index (FAISS) for duplicate detection
└── requirements.txt
```

## Tech Stack
- AI: Groq (extraction, priority, summaries)
- Duplicate detection: FAISS + sentence-transformers
- Backend: FastAPI
- Database: PostgreSQL
- Frontend: React + Leaflet

## Status
Step 1 complete: project scaffold created.
Next: define the AI report-extraction schema.
