# SpecScout - AI Shopping Assistant

> Score products against your personal "Style DNA" using semantic similarity

SpecScout is a Chrome extension + FastAPI backend that matches products to your taste profile. Describe items you love, then visit any product page and get an instant match score based on vector similarity.

## How It Works

```
You describe 1-5 items you love
    |
    v
Each item -> sentence-transformers (all-MiniLM-L6-v2) -> 384-dim vector
    |
    v
Vectors stored per-item in SQLite (no averaging/centroid)
    |
    v
Visit a product page -> extension scrapes title + description
    |
    v
Product text -> 384-dim vector -> cosine similarity vs EACH DNA vector
    |
    v
Score = max(similarities) -> "89% match — similar to your white leather sneakers"
```

**Why max per-item instead of centroid?** Averaging "minimalist sneakers" and "heavy boots" produces "medium shoe" — a style that doesn't exist. Max per-item preserves the nuance of each distinct taste.

## Architecture

```
Chrome Extension (Plasmo + React + TypeScript + Tailwind + Zustand)
  |
  | POST /onboard, /analyze, /dna/add, DELETE /dna/{id}, POST /dna/reset
  v
FastAPI Backend (Python)
  ├── ai_service.py   — sentence-transformers encoding + cosine similarity
  ├── database.py     — SQLite (WAL mode), per-request connections
  └── main.py         — API endpoints, CORS, dependency injection
```

## Quick Start

### Prerequisites

- Python 3.13+ with [uv](https://docs.astral.sh/uv/)
- Node.js 22 LTS
- Chrome browser

### Backend

```bash
cd backend
SPECSCOUT_DEV=1 uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

First run downloads the ML model (~90MB). Subsequent starts are fast.

### Extension

```bash
cd extension
npm install
cp .env.example .env
npm run build
```

### Load in Chrome

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select `extension/build/chrome-mv3-prod`
5. Click the SpecScout icon to open the side panel

### Docker (backend only)

```bash
docker compose up --build
```

## Usage

1. **Calibrate** — Enter 1-5 items you love (be specific: materials, colors, style)
2. **Browse** — Visit any product page (Amazon, Nike, etc.)
3. **Analyze** — Open side panel, click "Analyze This Product"
4. **Grow** — Click "Add to My Style DNA" on products you like (up to 50 items)
5. **Manage** — Delete individual DNA items or reset all from the profile view

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/onboard` | Create user with 1-5 favorite items |
| `POST` | `/analyze` | Score a product against user's DNA |
| `POST` | `/dna/add` | Add item to DNA (50 cap, deduplication) |
| `DELETE` | `/dna/{id}?user_id=` | Remove single DNA item |
| `POST` | `/dna/reset` | Remove all DNA items |
| `GET` | `/users/{user_id}` | Get user profile with DNA items |
| `GET` | `/health` | Health check |

Interactive docs at `http://localhost:8000/docs` when backend is running.

### Example

```bash
# Onboard
USER_ID=$(curl -s -X POST http://localhost:8000/onboard \
  -H "Content-Type: application/json" \
  -d '{"favorite_items": ["white minimalist leather sneakers", "black techwear cargo pants"]}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['user_id'])")

# Analyze
curl -s -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"$USER_ID\", \"product_title\": \"Nike Air Force 1\", \"product_description\": \"Classic white leather sneaker\"}"

# {"match_score": 0.896, "percentage": 89.6, "label": "Perfect Match",
#  "matched_item": "white minimalist leather sneakers", ...}
```

## Match Score Labels

| Score | Label | Meaning |
|-------|-------|---------|
| 85-100% | Perfect Match | Strongly aligns with your style |
| 70-84% | Great Fit | Good match, worth buying |
| 55-69% | Good Alternative | Some overlap, consider it |
| 40-54% | Moderate Match | Diverges from your taste |
| 0-39% | Not Your Style | Probably skip |

## Project Structure

```
ShopPilot/
├── backend/
│   ├── main.py              # FastAPI app, all endpoints
│   ├── ai_service.py         # Sentence transformer + similarity
│   ├── database.py           # SQLite CRUD, vector serialization
│   ├── pyproject.toml         # Python deps (uv)
│   ├── requirements.txt       # Python deps (pip fallback)
│   ├── Dockerfile
│   └── .dockerignore
├── extension/
│   ├── sidepanel.tsx          # Main side panel UI
│   ├── popup.tsx              # Popup (opens side panel)
│   ├── background.ts          # Service worker
│   ├── components/
│   │   ├── OnboardingForm.tsx  # 1-5 item calibration form
│   │   ├── ProductAnalysis.tsx # Product detection + DNA management
│   │   └── MatchResult.tsx     # Score display + "Add to DNA" button
│   ├── contents/
│   │   └── extract-product.ts  # Content script (scrapes product pages)
│   ├── store.ts               # Zustand + chrome.storage
│   ├── api.ts                 # Backend API client
│   ├── types.ts               # TypeScript interfaces
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | Plasmo 0.90, React 18, TypeScript, Tailwind CSS, Zustand |
| Backend | FastAPI, Uvicorn, Python 3.13 |
| AI | sentence-transformers (all-MiniLM-L6-v2), scikit-learn |
| Storage | SQLite (WAL mode), chrome.storage.local |
| Deploy | Docker multi-stage (python:3.13-slim + uv) |

## CORS

Production mode restricts origins to `chrome-extension://*`. Set `SPECSCOUT_DEV=1` to allow all origins during development.
