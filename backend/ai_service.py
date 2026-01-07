"""
AI Service for SpecScout - Handles vectorization and similarity matching
Uses sentence-transformers for encoding text into embeddings
"""

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import List, Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AIService:
    """
    Service for handling text vectorization and similarity matching.

    Uses all-MiniLM-L6-v2 model for lightweight embeddings.
    Model produces 384-dimensional vectors.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the AI service with a sentence transformer model.

        Args:
            model_name: Name of the sentence-transformers model to use
        """
        logger.info(f"Loading model: {model_name}")
        self.model = SentenceTransformer(model_name)
        logger.info("Model loaded successfully")

    def encode_texts(self, texts: List[str]) -> np.ndarray:
        """
        Convert a list of text strings into vector embeddings.

        Args:
            texts: List of text strings to encode

        Returns:
            NumPy array of shape (n_texts, embedding_dim)
        """
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        logger.info(f"Encoded {len(texts)} texts into vectors of shape {embeddings.shape}")
        return embeddings

    def calculate_centroid(self, vectors: np.ndarray) -> np.ndarray:
        """
        Calculate the mean vector (centroid) from multiple vectors.

        This represents the "average taste" of the user based on their favorite items.

        Args:
            vectors: Array of shape (n_vectors, embedding_dim)

        Returns:
            Mean vector of shape (embedding_dim,)
        """
        centroid = np.mean(vectors, axis=0)
        logger.info(f"Calculated centroid vector of shape {centroid.shape}")
        return centroid

    def calculate_similarity(self, vector1: np.ndarray, vector2: np.ndarray) -> float:
        """
        Calculate cosine similarity between two vectors.

        Cosine similarity ranges from -1 to 1:
        - 1: Identical direction (perfect match)
        - 0: Orthogonal (no similarity)
        - -1: Opposite direction (complete mismatch)

        We convert this to a 0-100% scale for user-friendly display.

        Args:
            vector1: First vector
            vector2: Second vector

        Returns:
            Similarity score as a float between 0 and 1
        """
        # Reshape vectors to 2D arrays for sklearn
        v1 = vector1.reshape(1, -1)
        v2 = vector2.reshape(1, -1)

        # Calculate cosine similarity
        similarity = cosine_similarity(v1, v2)[0][0]

        # Convert from [-1, 1] to [0, 1] range
        # In practice, text embeddings rarely go below 0, but we handle it
        normalized_similarity = (similarity + 1) / 2

        logger.info(f"Calculated similarity: {similarity:.4f} (normalized: {normalized_similarity:.4f})")
        return float(normalized_similarity)

    def get_match_label(self, score: float) -> str:
        """
        Convert a numerical match score to a human-readable label.

        Args:
            score: Match score between 0 and 1

        Returns:
            Label string describing the match quality
        """
        percentage = score * 100

        if percentage >= 85:
            return "Perfect Match"
        elif percentage >= 70:
            return "Great Fit"
        elif percentage >= 55:
            return "Good Alternative"
        elif percentage >= 40:
            return "Moderate Match"
        else:
            return "Not Your Style"

    def create_user_profile(self, favorite_items: List[str]) -> Tuple[np.ndarray, dict]:
        """
        Create a user profile from their favorite items.

        Args:
            favorite_items: List of 3 text descriptions of favorite items

        Returns:
            Tuple of (centroid_vector, metadata_dict)
        """
        if len(favorite_items) != 3:
            raise ValueError("Exactly 3 favorite items required for calibration")

        # Encode all favorite items
        vectors = self.encode_texts(favorite_items)

        # Calculate centroid (mean vector)
        centroid = self.calculate_centroid(vectors)

        # Create metadata
        metadata = {
            "favorite_items": favorite_items,
            "vector_dimension": centroid.shape[0],
            "calibrated": True
        }

        logger.info(f"Created user profile with {len(favorite_items)} items")
        return centroid, metadata

    def analyze_product(
        self,
        user_vector: np.ndarray,
        product_title: str,
        product_description: str
    ) -> dict:
        """
        Analyze a product against a user's taste profile.

        Args:
            user_vector: User's centroid vector
            product_title: Title of the product
            product_description: Description of the product

        Returns:
            Dictionary with match_score (0-1), percentage (0-100), and label
        """
        # Combine title and description for richer context
        product_text = f"{product_title}. {product_description}"

        # Encode product text
        product_vector = self.encode_texts([product_text])[0]

        # Calculate similarity
        similarity = self.calculate_similarity(user_vector, product_vector)

        # Get label
        label = self.get_match_label(similarity)

        result = {
            "match_score": similarity,
            "percentage": round(similarity * 100, 1),
            "label": label,
            "reasoning": f"Based on your style preferences, this product is a {label.lower()}."
        }

        logger.info(f"Product analysis: {result}")
        return result


# Global instance (loaded once for performance)
ai_service = None


def get_ai_service() -> AIService:
    """
    Get or create the global AI service instance.
    Ensures the model is loaded only once in memory.
    """
    global ai_service
    if ai_service is None:
        ai_service = AIService()
    return ai_service
