import sqlite3
import json
import os
from datetime import datetime

# Store DB in user's home dir so Live Server never watches it
DB_PATH = os.path.join(os.path.expanduser("~"), "biomatch.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sequence TEXT NOT NULL,
            label TEXT,
            classification TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def save_result(sequence: str, label: str, classification: dict):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO results (sequence, label, classification, created_at) VALUES (?, ?, ?, ?)",
        (sequence, label, json.dumps(classification), datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def get_history(limit: int = 20) -> list:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, sequence, label, classification, created_at FROM results ORDER BY created_at DESC LIMIT ?",
        (limit,)
    )
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": row[0],
            "sequence": row[1][:30] + "..." if len(row[1]) > 30 else row[1],
            "full_sequence": row[1],
            "label": row[2],
            "classification": json.loads(row[3]),
            "created_at": row[4]
        }
        for row in rows
    ]

def clear_all():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM results")
    conn.commit()
    conn.close()