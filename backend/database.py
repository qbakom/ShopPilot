"""
SQLite persistence for SpecScout user profiles and Style DNA vectors.

Tables:
  - users: stores user_id and creation timestamp
  - style_dna: stores individual item text + vector blob per user

Connection pattern: per-request via get_db() generator (safe for multiple workers).
Vector serialization uses raw float32 bytes (384 dims * 4 bytes = 1536 bytes per vector).
"""

import os
import sqlite3
import numpy as np
from pathlib import Path
from typing import Generator, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

DB_PATH = Path(os.environ.get("SPECSCOUT_DB_PATH", str(Path(__file__).parent / "specscout.db")))


def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Yield a per-request SQLite connection. Used as a FastAPI dependency."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    """Create tables if they don't exist, and apply schema migrations."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                user_id    TEXT PRIMARY KEY,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS style_dna (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id       TEXT NOT NULL REFERENCES users(user_id),
                item_text     TEXT NOT NULL,
                vector_blob   BLOB NOT NULL,
                model_version TEXT NOT NULL DEFAULT '',
                created_at    TEXT DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_style_dna_user
                ON style_dna(user_id);

            CREATE UNIQUE INDEX IF NOT EXISTS idx_style_dna_user_item
                ON style_dna(user_id, item_text);
        """)
        conn.commit()

        # Migrate: add model_version column if missing (existing DBs)
        try:
            conn.execute("ALTER TABLE style_dna ADD COLUMN model_version TEXT NOT NULL DEFAULT ''")
            conn.commit()
        except sqlite3.OperationalError:
            pass  # Column already exists

        logger.info(f"Database initialized at {DB_PATH}")
    finally:
        conn.close()


# --- Vector serialization helpers ---

def _serialize_vector(vec: np.ndarray) -> bytes:
    return vec.astype(np.float32).tobytes()


def _deserialize_vector(blob: bytes) -> np.ndarray:
    return np.frombuffer(blob, dtype=np.float32)


# --- CRUD ---

def create_user(conn: sqlite3.Connection, user_id: str) -> None:
    conn.execute("INSERT INTO users (user_id) VALUES (?)", (user_id,))
    conn.commit()


def user_exists(conn: sqlite3.Connection, user_id: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM users WHERE user_id = ?", (user_id,)
    ).fetchone()
    return row is not None


def insert_dna_item(
    conn: sqlite3.Connection,
    user_id: str,
    item_text: str,
    vector: np.ndarray,
    model_version: str = "",
) -> Optional[int]:
    """Insert a single Style DNA item. Returns row id, or None if duplicate."""
    cursor = conn.execute(
        "INSERT OR IGNORE INTO style_dna (user_id, item_text, vector_blob, model_version) VALUES (?, ?, ?, ?)",
        (user_id, item_text, _serialize_vector(vector), model_version),
    )
    conn.commit()
    if cursor.rowcount == 0:
        return None
    return cursor.lastrowid


def get_user_dna(conn: sqlite3.Connection, user_id: str) -> List[Tuple[int, str, np.ndarray]]:
    """Return list of (id, item_text, vector) for a user."""
    rows = conn.execute(
        "SELECT id, item_text, vector_blob FROM style_dna WHERE user_id = ? ORDER BY id",
        (user_id,),
    ).fetchall()
    return [(row["id"], row["item_text"], _deserialize_vector(row["vector_blob"])) for row in rows]


def get_user_items(conn: sqlite3.Connection, user_id: str) -> List[Tuple[int, str]]:
    """Return list of (id, item_text) for a user."""
    rows = conn.execute(
        "SELECT id, item_text FROM style_dna WHERE user_id = ? ORDER BY id",
        (user_id,),
    ).fetchall()
    return [(row["id"], row["item_text"]) for row in rows]


def get_dna_count(conn: sqlite3.Connection, user_id: str) -> int:
    row = conn.execute(
        "SELECT COUNT(*) AS cnt FROM style_dna WHERE user_id = ?", (user_id,)
    ).fetchone()
    return row["cnt"]


def delete_dna_item(conn: sqlite3.Connection, dna_id: int, user_id: str) -> bool:
    """Delete a single DNA item by id (scoped to user). Returns True if deleted."""
    cursor = conn.execute(
        "DELETE FROM style_dna WHERE id = ? AND user_id = ?", (dna_id, user_id)
    )
    conn.commit()
    return cursor.rowcount > 0


def reset_user_dna(conn: sqlite3.Connection, user_id: str) -> int:
    """Delete all DNA items for a user. Returns count of deleted rows."""
    cursor = conn.execute(
        "DELETE FROM style_dna WHERE user_id = ?", (user_id,)
    )
    conn.commit()
    return cursor.rowcount


def get_user_count(conn: sqlite3.Connection) -> int:
    row = conn.execute("SELECT COUNT(*) AS cnt FROM users").fetchone()
    return row["cnt"]
