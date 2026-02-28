"""
SpecScout Backend API
FastAPI application for product matching based on user taste profiles
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict
import uuid
import numpy as np
import logging

from ai_service import get_ai_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SpecScout API",
    description="AI-powered shopping assistant that matches products to your personal style",
    version="1.0.0"
)

# CORS middleware to allow extension to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to extension ID
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for MVP (replace with database in production)
user_sessions: Dict[str, dict] = {}


# ============================================================================
# Request/Response Models
# ============================================================================

class OnboardRequest(BaseModel):
    """Request model for user onboarding"""
    favorite_items: List[str] = Field(
        ...,
        min_length=3,
        max_length=3,
        description="List of exactly 3 favorite items for taste calibration"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "favorite_items": [
                    "Black minimalist gore-tex jacket with hidden pockets",
                    "Merino wool crew neck sweater in charcoal grey",
                    "Japanese selvedge denim jeans with subtle fading"
                ]
            }
        }


class OnboardResponse(BaseModel):
    """Response model for user onboarding"""
    user_id: str
    message: str
    calibrated: bool
    favorite_items: List[str]


class AnalyzeRequest(BaseModel):
    """Request model for product analysis"""
    user_id: str
    product_title: str
    product_description: str

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "product_title": "Waterproof Technical Jacket",
                "product_description": "Lightweight waterproof jacket with sealed seams and minimalist design"
            }
        }


class AnalyzeResponse(BaseModel):
    """Response model for product analysis"""
    match_score: float = Field(..., ge=0, le=1, description="Raw similarity score (0-1)")
    percentage: float = Field(..., ge=0, le=100, description="Match percentage (0-100)")
    label: str = Field(..., description="Human-readable match quality label")
    reasoning: str = Field(..., description="Explanation of the match")


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "SpecScout API",
        "status": "running",
        "version": "1.0.0"
    }


@app.post("/onboard", response_model=OnboardResponse)
async def onboard_user(request: OnboardRequest):
    """
    Onboard a new user by creating their taste profile.

    This endpoint:
    1. Takes 3 favorite items as text descriptions
    2. Converts them to vector embeddings
    3. Calculates a centroid (mean vector) representing the user's taste
    4. Stores the profile and returns a user_id for future requests

    Args:
        request: OnboardRequest with 3 favorite items

    Returns:
        OnboardResponse with user_id and calibration confirmation
    """
    try:
        logger.info(f"Onboarding new user with {len(request.favorite_items)} items")

        # Get AI service
        ai_service = get_ai_service()

        # Create user profile (centroid vector + metadata)
        centroid_vector, metadata = ai_service.create_user_profile(request.favorite_items)

        # Generate unique user ID
        user_id = str(uuid.uuid4())

        # Store user profile in memory
        # Note: Convert numpy array to list for JSON serialization
        user_sessions[user_id] = {
            "vector": centroid_vector.tolist(),  # Store as list
            "metadata": metadata,
            "created_at": None  # Could add timestamp in production
        }

        logger.info(f"User {user_id} onboarded successfully")

        return OnboardResponse(
            user_id=user_id,
            message="Taste profile created successfully",
            calibrated=True,
            favorite_items=request.favorite_items
        )

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error during onboarding: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create user profile")


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_product(request: AnalyzeRequest):
    """
    Analyze a product against the user's taste profile.

    This endpoint:
    1. Retrieves the user's stored centroid vector
    2. Converts the product title + description to a vector
    3. Calculates cosine similarity between user taste and product
    4. Returns a match score with human-readable labels

    Args:
        request: AnalyzeRequest with user_id and product details

    Returns:
        AnalyzeResponse with match score, percentage, and label
    """
    try:
        logger.info(f"Analyzing product for user {request.user_id}")

        # Validate user exists
        if request.user_id not in user_sessions:
            raise HTTPException(
                status_code=404,
                detail="User not found. Please complete onboarding first."
            )

        # Get user's centroid vector
        user_data = user_sessions[request.user_id]
        user_vector = np.array(user_data["vector"])  # Convert back to numpy array

        # Get AI service
        ai_service = get_ai_service()

        # Analyze product (pass favorite items for per-item reasoning)
        favorite_items = user_data["metadata"].get("favorite_items", [])
        result = ai_service.analyze_product(
            user_vector=user_vector,
            product_title=request.product_title,
            product_description=request.product_description,
            favorite_items=favorite_items
        )

        logger.info(f"Analysis complete: {result['percentage']}% match")

        return AnalyzeResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to analyze product")


@app.get("/users/{user_id}")
async def get_user_profile(user_id: str):
    """
    Get user profile metadata (for debugging/testing).

    Args:
        user_id: User's unique identifier

    Returns:
        User profile metadata (without raw vector data)
    """
    if user_id not in user_sessions:
        raise HTTPException(status_code=404, detail="User not found")

    user_data = user_sessions[user_id]
    return {
        "user_id": user_id,
        "metadata": user_data["metadata"],
        "vector_shape": len(user_data["vector"])
    }


@app.get("/health")
async def health_check():
    """Detailed health check endpoint"""
    return {
        "status": "healthy",
        "active_users": len(user_sessions),
        "model_loaded": get_ai_service() is not None
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
