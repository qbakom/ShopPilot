# Role
You are a Senior Full-Stack Architect and AI Engineer. You are tasked with building an MVP for a browser-based shopping assistant called "SpecScout".

# Project Objective
Create a Chrome Extension (and companion backend) that helps users overcome decision paralysis by scoring products based on their personal "Style DNA" and technical specifications, rather than just hype or random suggestions.

# Tech Stack
1.  **Frontend (Extension):** Plasmo Framework (React + TypeScript), Tailwind CSS, Lucide React (Icons), Zustand (State Management).
2.  **Backend (API):** FastAPI (Python), Uvicorn.
3.  **AI & Logic:** `sentence-transformers` (specifically `all-MiniLM-L6-v2` for lightweight embeddings), Scikit-learn (for cosine similarity).
4.  **Data Persistence:** In-memory (for MVP) or simple JSON store.

# Core Logic (The "Brain")
The system relies on a **Hybrid Scoring Mechanism**:
1.  **User Onboarding:** The user inputs text descriptions of 3 favorite items they own (e.g., "Black gore-tex minimalist jacket").
2.  **Vectorization:** The backend converts these 3 inputs into vectors and calculates a "Mean User Vector" (Centroid).
3.  **Matching:** When the user visits a product page, the extension extracts the product description. The backend vectorizes it and calculates the **Cosine Similarity** against the User Vector.
4.  **Output:** A "Match Score" (0-100%) presented in the UI.

# Implementation Roadmap (Step-by-Step)

## Phase 1: Backend (FastAPI + AI Service)
Create a folder `backend`. Initialize a FastAPI app with the following endpoints:
1.  `POST /onboard`: Accepts a list of 3 text strings. Loads `sentence-transformers`, encodes them, calculates the mean vector, and returns/stores a user_id with this vector.
2.  `POST /analyze`: Accepts `product_title` and `product_description`. Encodes this data into a vector. Calculates cosine similarity against the stored User Vector. Returns a JSON with `{ match_score: float, reasoning: string }`.
*Note: Keep the ML model loaded in memory for speed.*

## Phase 2: Frontend (Plasmo Extension)
Create a folder `extension` using Plasmo.
1.  **Side Panel UI:**
    * **State A (Empty):** A form asking: "List 3 items you love to calibrate your taste".
    * **State B (Active):** When on a product page, show a "Analyze this Product" button.
    * **State C (Result):** Display a gauge/bar showing the Match Score (e.g., "85% Match") and a brief label (e.g., "Perfect Fit", "Good Alternative", "Not for you").
2.  **Content Script:**
    * Create a simple script that scrapes `h1` (Title) and `meta[name="description"]` or generic paragraph text from the active tab to simulate product data extraction.

# Coding Standards
* Use modular code structure.
* Use TypeScript interfaces for all data passing.
* Add comments explaining the vector math logic.
* Create a `requirements.txt` for the python backend.
* Do NOT implement complex database logic yet; store user vectors in a Python dictionary `user_sessions = {}` for this MVP session.

# Execution
Start by setting up the project structure with a Monorepo approach (`/backend` and `/extension`). Generate the backend code first, then the frontend.
