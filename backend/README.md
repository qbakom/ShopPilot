# SpecScout Backend API

FastAPI-based backend for the SpecScout shopping assistant. Handles user taste profiling and product matching using sentence transformers and cosine similarity.

## Features

- **User Onboarding**: Creates taste profiles from 3 favorite items
- **Product Analysis**: Scores products based on user preferences
- **Lightweight AI**: Uses all-MiniLM-L6-v2 for fast embeddings
- **In-Memory Storage**: Simple session management for MVP

## Tech Stack

- **FastAPI**: Modern Python web framework
- **Sentence Transformers**: Text embedding model
- **Scikit-learn**: Cosine similarity calculations
- **Uvicorn**: ASGI server

## Setup

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

This will download the sentence-transformers model (~80MB) on first run.

### 3. Run the Server

```bash
python main.py
```

Or with uvicorn directly:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### POST /onboard

Create a user taste profile from 3 favorite items.

**Request:**
```json
{
  "favorite_items": [
    "Black minimalist gore-tex jacket with hidden pockets",
    "Merino wool crew neck sweater in charcoal grey",
    "Japanese selvedge denim jeans with subtle fading"
  ]
}
```

**Response:**
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "message": "Taste profile created successfully",
  "calibrated": true,
  "favorite_items": [...]
}
```

### POST /analyze

Analyze a product against user preferences.

**Request:**
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "product_title": "Waterproof Technical Jacket",
  "product_description": "Lightweight waterproof jacket with sealed seams"
}
```

**Response:**
```json
{
  "match_score": 0.87,
  "percentage": 87.0,
  "label": "Perfect Match",
  "reasoning": "Based on your style preferences, this product is a perfect match."
}
```

## How It Works

1. **Vectorization**: Text descriptions → 384-dimensional embeddings
2. **Centroid Calculation**: Mean of 3 favorite items = User Vector
3. **Similarity Matching**: Cosine similarity between User Vector and Product Vector
4. **Scoring**: Similarity converted to 0-100% match score

## Development

### Project Structure

```
backend/
├── main.py           # FastAPI application and endpoints
├── ai_service.py     # ML logic (embeddings, similarity)
├── requirements.txt  # Python dependencies
└── README.md         # This file
```

### Testing with cURL

```bash
# Onboard a user
curl -X POST http://localhost:8000/onboard \
  -H "Content-Type: application/json" \
  -d '{"favorite_items": ["item1", "item2", "item3"]}'

# Analyze a product
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id",
    "product_title": "Product Name",
    "product_description": "Product details"
  }'
```

## Production Considerations

For production deployment:
- Replace in-memory storage with Redis/PostgreSQL
- Add authentication and rate limiting
- Restrict CORS to specific origins
- Add logging and monitoring
- Use environment variables for configuration
- Deploy with Docker/Kubernetes
