"""
AI Service for SpecScout - Handles vectorization and similarity matching
Uses sentence-transformers for encoding text into embeddings
"""

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import List, Tuple, Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


MODEL_NAME = "all-MiniLM-L6-v2"


class AIService:
    """
    Service for handling text vectorization and similarity matching.

    Uses all-MiniLM-L6-v2 model for lightweight embeddings.
    Model produces 384-dimensional vectors.
    """

    def __init__(self, model_name: str = MODEL_NAME):
        """
        Initialize the AI service with a sentence transformer model.

        Args:
            model_name: Name of the sentence-transformers model to use
        """
        logger.info(f"Loading model: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.model_name = model_name
        logger.info("Model loaded successfully")

    def encode_single_text(self, text: str) -> np.ndarray:
        """Encode a single text string into a vector embedding."""
        return self.model.encode([text], convert_to_numpy=True)[0]

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
        product_description: str,
        favorite_items: List[str] = None
    ) -> dict:
        """
        Analyze a product against a user's taste profile.

        Compares the product vector against:
        1. The user's centroid (overall taste) for the main score
        2. Each individual favorite item to identify the closest match

        Args:
            user_vector: User's centroid vector
            product_title: Title of the product
            product_description: Description of the product
            favorite_items: Original favorite item descriptions for per-item comparison

        Returns:
            Dictionary with match_score (0-1), percentage (0-100), label, and reasoning
        """
        # Combine title and description for richer context
        product_text = f"{product_title}. {product_description}"

        # Encode product text
        product_vector = self.encode_texts([product_text])[0]

        # Calculate similarity against centroid
        similarity = self.calculate_similarity(user_vector, product_vector)

        # Get label
        label = self.get_match_label(similarity)

        # Build reasoning by comparing against each individual favorite item
        reasoning = self._build_reasoning(
            product_vector, product_title, label, similarity, favorite_items
        )

        result = {
            "match_score": similarity,
            "percentage": round(similarity * 100, 1),
            "label": label,
            "reasoning": reasoning
        }

        logger.info(f"Product analysis: {result}")
        return result

    def _build_reasoning(
        self,
        product_vector: np.ndarray,
        product_title: str,
        label: str,
        overall_score: float,
        favorite_items: List[str] = None
    ) -> str:
        """
        Generate meaningful reasoning by comparing the product against
        each individual favorite item to find the closest stylistic match.
        """
        if not favorite_items:
            return f"This product scores as a '{label}' against your overall style profile."

        # Encode each favorite item individually and compare
        item_vectors = self.encode_texts(favorite_items)
        item_scores = []
        for i, item_vec in enumerate(item_vectors):
            score = self.calculate_similarity(item_vec, product_vector)
            item_scores.append((favorite_items[i], score))

        # Sort by similarity (highest first)
        item_scores.sort(key=lambda x: x[1], reverse=True)
        best_item, best_score = item_scores[0]
        worst_item, worst_score = item_scores[-1]

        best_pct = round(best_score * 100)
        worst_pct = round(worst_score * 100)

        # Truncate item descriptions for readability
        best_short = best_item[:60] + "..." if len(best_item) > 60 else best_item
        worst_short = worst_item[:60] + "..." if len(worst_item) > 60 else worst_item

        if overall_score >= 0.70:
            return (
                f'"{product_title}" is most similar to your "{best_short}" '
                f"({best_pct}% match). It aligns well with your overall taste profile."
            )
        elif overall_score >= 0.55:
            return (
                f'This product shares some qualities with your "{best_short}" '
                f"({best_pct}% match), but diverges from your "
                f'"{worst_short}" ({worst_pct}% match).'
            )
        else:
            return (
                f"This product doesn't closely match any of your favorites. "
                f'Closest is your "{best_short}" at {best_pct}%, '
                f"suggesting it's outside your usual style."
            )


    def analyze_product_max_sim(
        self,
        dna_items: List[Tuple[str, np.ndarray]],
        product_title: str,
        product_description: str,
    ) -> Dict:
        """
        Analyze a product using max per-item similarity instead of centroid.

        For each DNA item vector, compute cosine similarity against the product
        vector and take the maximum. This preserves nuance — a user who likes
        both "minimalist sneakers" and "heavy boots" won't average to "medium shoe".

        Args:
            dna_items: List of (item_text, vector) tuples from the user's Style DNA
            product_title: Product page title
            product_description: Product page description

        Returns:
            Dict with match_score, percentage, label, reasoning, matched_item
        """
        product_text = f"{product_title}. {product_description}"
        product_vector = self.encode_single_text(product_text)

        best_score = 0.0
        best_item_text = ""
        for item_text, item_vector in dna_items:
            score = self.calculate_similarity(item_vector, product_vector)
            if score > best_score:
                best_score = score
                best_item_text = item_text

        label = self.get_match_label(best_score)
        reasoning = self._build_reasoning_max_sim(
            product_title, best_score, best_item_text, label
        )

        return {
            "match_score": best_score,
            "percentage": round(best_score * 100, 1),
            "label": label,
            "reasoning": reasoning,
            "matched_item": best_item_text,
        }

    def _build_reasoning_max_sim(
        self,
        product_title: str,
        score: float,
        matched_item: str,
        label: str,
    ) -> str:
        """Build reasoning string referencing the specific matched DNA item."""
        short = matched_item[:60] + "..." if len(matched_item) > 60 else matched_item
        pct = round(score * 100)

        if score >= 0.70:
            return (
                f'"{product_title}" is most similar to your "{short}" '
                f"({pct}% match). It aligns well with your style."
            )
        elif score >= 0.55:
            return (
                f'This product shares some qualities with your "{short}" '
                f"({pct}% match), but isn't a strong overlap."
            )
        else:
            return (
                f"This product doesn't closely match any of your favorites. "
                f'Closest is your "{short}" at {pct}%, '
                f"suggesting it's outside your usual style."
            )


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
