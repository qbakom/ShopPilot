"""
SpecScout Backend API
FastAPI application for product matching based on user taste profiles.
Uses SQLite for persistence and max per-item similarity for scoring.
"""

import os
import sqlite3

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
import uuid
import logging

from ai_service import get_ai_service, MODEL_NAME
import database as db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DNA_ITEM_CAP = 50

app = FastAPI(
    title="SpecScout API",
    description="AI-powered shopping assistant that matches products to your personal style",
    version="3.0.0",
)

# CORS: lock down to chrome-extension:// origins in production,
# allow all in dev mode via SPECSCOUT_DEV env var.
cors_kwargs = {
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if os.environ.get("SPECSCOUT_DEV"):
    cors_kwargs["allow_origins"] = ["*"]
else:
    cors_kwargs["allow_origin_regex"] = r"^chrome-extension://.*$"

app.add_middleware(CORSMiddleware, **cors_kwargs)


def get_conn():
    """FastAPI dependency — yields a per-request SQLite connection."""
    yield from db.get_db()


@app.on_event("startup")
async def startup_event():
    """Initialize database and pre-load the ML model on server start."""
    db.init_db()
    logger.info("Pre-loading AI model...")
    get_ai_service()
    logger.info("AI model ready")


# ============================================================================
# Request/Response Models
# ============================================================================

class OnboardRequest(BaseModel):
    favorite_items: List[str] = Field(
        ...,
        min_length=1,
        max_length=5,
        description="List of 1-5 favorite items for taste calibration",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "favorite_items": [
                    "Black minimalist gore-tex jacket with hidden pockets",
                    "Merino wool crew neck sweater in charcoal grey",
                ]
            }
        }


class OnboardResponse(BaseModel):
    user_id: str
    message: str
    calibrated: bool
    favorite_items: List[str]


class AnalyzeRequest(BaseModel):
    user_id: str
    product_title: str
    product_description: str


class AnalyzeResponse(BaseModel):
    match_score: float = Field(..., ge=0, le=1)
    percentage: float = Field(..., ge=0, le=100)
    label: str
    reasoning: str
    matched_item: str = ""


class DnaAddRequest(BaseModel):
    user_id: str
    item_text: str = Field(..., min_length=3)


class DnaAddResponse(BaseModel):
    message: str
    dna_count: int


class DnaDeleteResponse(BaseModel):
    message: str
    dna_count: int


class DnaResetRequest(BaseModel):
    user_id: str


class DnaResetResponse(BaseModel):
    message: str
    deleted_count: int


class DnaItemOut(BaseModel):
    id: int
    text: str


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
async def root():
    return {"service": "SpecScout API", "status": "running", "version": "3.0.0"}


@app.post("/onboard", response_model=OnboardResponse)
async def onboard_user(request: OnboardRequest, conn: sqlite3.Connection = Depends(get_conn)):
    """
    Onboard a new user by creating their taste profile.
    Accepts 1-5 favorite items; each stored as a separate DNA vector.
    """
    try:
        ai_service = get_ai_service()
        user_id = str(uuid.uuid4())

        db.create_user(conn, user_id)

        for item_text in request.favorite_items:
            vector = ai_service.encode_single_text(item_text)
            db.insert_dna_item(conn, user_id, item_text, vector, model_version=MODEL_NAME)

        logger.info(f"User {user_id} onboarded with {len(request.favorite_items)} DNA items")

        return OnboardResponse(
            user_id=user_id,
            message="Taste profile created successfully",
            calibrated=True,
            favorite_items=request.favorite_items,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error during onboarding: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user profile")


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_product(request: AnalyzeRequest, conn: sqlite3.Connection = Depends(get_conn)):
    """Analyze a product against the user's Style DNA using max per-item similarity."""
    try:
        if not db.user_exists(conn, request.user_id):
            raise HTTPException(status_code=404, detail="User not found. Please complete onboarding first.")

        dna_rows = db.get_user_dna(conn, request.user_id)
        if not dna_rows:
            raise HTTPException(status_code=400, detail="No Style DNA items found. Please complete onboarding first.")

        # Strip ids before passing to AI service
        dna_items = [(text, vec) for _id, text, vec in dna_rows]

        ai_service = get_ai_service()
        result = ai_service.analyze_product_max_sim(
            dna_items=dna_items,
            product_title=request.product_title,
            product_description=request.product_description,
        )

        return AnalyzeResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during analysis: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze product")


@app.post("/dna/add", response_model=DnaAddResponse)
async def add_to_dna(request: DnaAddRequest, conn: sqlite3.Connection = Depends(get_conn)):
    """Add a new item to a user's Style DNA (max 50 items)."""
    try:
        if not db.user_exists(conn, request.user_id):
            raise HTTPException(status_code=404, detail="User not found")

        count = db.get_dna_count(conn, request.user_id)
        if count >= DNA_ITEM_CAP:
            raise HTTPException(
                status_code=400,
                detail=f"Style DNA is at capacity ({DNA_ITEM_CAP} items). Remove items before adding new ones.",
            )

        ai_service = get_ai_service()
        vector = ai_service.encode_single_text(request.item_text)
        row_id = db.insert_dna_item(conn, request.user_id, request.item_text, vector, model_version=MODEL_NAME)

        if row_id is None:
            return DnaAddResponse(
                message="Item already exists in your Style DNA",
                dna_count=count,
            )

        new_count = db.get_dna_count(conn, request.user_id)
        return DnaAddResponse(message="Item added to your Style DNA", dna_count=new_count)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding DNA item: {e}")
        raise HTTPException(status_code=500, detail="Failed to add item to Style DNA")


@app.delete("/dna/{dna_id}", response_model=DnaDeleteResponse)
async def delete_dna_item(dna_id: int, user_id: str, conn: sqlite3.Connection = Depends(get_conn)):
    """Delete a single Style DNA item by id (scoped to user)."""
    if not db.user_exists(conn, user_id):
        raise HTTPException(status_code=404, detail="User not found")

    deleted = db.delete_dna_item(conn, dna_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="DNA item not found")

    count = db.get_dna_count(conn, user_id)
    return DnaDeleteResponse(message="Item removed from your Style DNA", dna_count=count)


@app.post("/dna/reset", response_model=DnaResetResponse)
async def reset_dna(request: DnaResetRequest, conn: sqlite3.Connection = Depends(get_conn)):
    """Delete all Style DNA items for a user."""
    if not db.user_exists(conn, request.user_id):
        raise HTTPException(status_code=404, detail="User not found")

    deleted_count = db.reset_user_dna(conn, request.user_id)
    return DnaResetResponse(message="All Style DNA items removed", deleted_count=deleted_count)


@app.get("/users/{user_id}")
async def get_user_profile(user_id: str, conn: sqlite3.Connection = Depends(get_conn)):
    """Get user profile with structured DNA items (id + text)."""
    if not db.user_exists(conn, user_id):
        raise HTTPException(status_code=404, detail="User not found")

    items = db.get_user_items(conn, user_id)
    return {
        "user_id": user_id,
        "dna_items": [{"id": item_id, "text": text} for item_id, text in items],
        "dna_count": len(items),
    }


@app.get("/health")
async def health_check(conn: sqlite3.Connection = Depends(get_conn)):
    return {
        "status": "healthy",
        "active_users": db.get_user_count(conn),
        "model_loaded": get_ai_service() is not None,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
