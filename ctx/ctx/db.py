"""Database setup and operations for ctx."""

import sqlite3
from pathlib import Path
from typing import Optional, List, Tuple
from datetime import datetime

CTX_DIR = Path.home() / '.ctx'
DB_PATH = CTX_DIR / 'sessions.db'


def get_db_path() -> Path:
    """Return the database path, creating directory if needed."""
    CTX_DIR.mkdir(exist_ok=True)
    return DB_PATH


def get_connection() -> sqlite3.Connection:
    """Get a database connection with row factory."""
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize the database schema."""
    CTX_DIR.mkdir(exist_ok=True)

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY,
            repo_path TEXT NOT NULL,
            branch TEXT,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ended_at TIMESTAMP,
            last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS file_changes (
            id INTEGER PRIMARY KEY,
            session_id INTEGER NOT NULL,
            filepath TEXT NOT NULL,
            context TEXT,
            lines_changed INTEGER DEFAULT 0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions (id),
            UNIQUE(session_id, filepath)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS commands (
            id INTEGER PRIMARY KEY,
            session_id INTEGER NOT NULL,
            command TEXT NOT NULL,
            exit_code INTEGER,
            cwd TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions (id)
        )
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_sessions_active
        ON sessions (ended_at, last_active DESC)
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_sessions_branch
        ON sessions (branch)
    ''')

    conn.commit()
    conn.close()


def get_current_session() -> Optional[sqlite3.Row]:
    """Get the current active session, if any."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT id, repo_path, branch, started_at, last_active
        FROM sessions
        WHERE ended_at IS NULL
        ORDER BY last_active DESC
        LIMIT 1
    ''')

    result = cursor.fetchone()
    conn.close()
    return result


def start_session(repo_path: str, branch: Optional[str]) -> int:
    """Start a new session, ending any current one. Returns session ID."""
    conn = get_connection()
    cursor = conn.cursor()

    # End any active sessions
    cursor.execute('''
        UPDATE sessions
        SET ended_at = CURRENT_TIMESTAMP
        WHERE ended_at IS NULL
    ''')

    # Start new session
    cursor.execute('''
        INSERT INTO sessions (repo_path, branch)
        VALUES (?, ?)
    ''', (repo_path, branch))

    session_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return session_id


def update_session_activity(session_id: int) -> None:
    """Update the last_active timestamp for a session."""
    conn = get_connection()
    conn.execute('''
        UPDATE sessions
        SET last_active = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (session_id,))
    conn.commit()
    conn.close()


def end_current_session() -> bool:
    """End the current session. Returns True if a session was ended."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        UPDATE sessions
        SET ended_at = CURRENT_TIMESTAMP
        WHERE ended_at IS NULL
    ''')

    affected = cursor.rowcount
    conn.commit()
    conn.close()

    return affected > 0


def record_file_change(session_id: int, filepath: str, context: str = "",
                       lines_changed: int = 0) -> None:
    """Record a file change in the current session."""
    conn = get_connection()
    conn.execute('''
        INSERT INTO file_changes (session_id, filepath, context, lines_changed)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(session_id, filepath)
        DO UPDATE SET
            context = excluded.context,
            lines_changed = lines_changed + excluded.lines_changed,
            timestamp = CURRENT_TIMESTAMP
    ''', (session_id, filepath, context, lines_changed))
    conn.commit()
    conn.close()


def record_command(session_id: int, command: str, exit_code: int,
                   cwd: Optional[str] = None) -> None:
    """Record a command execution."""
    conn = get_connection()
    conn.execute('''
        INSERT INTO commands (session_id, command, exit_code, cwd)
        VALUES (?, ?, ?, ?)
    ''', (session_id, command, exit_code, cwd))
    conn.commit()
    conn.close()


def get_session_files(session_id: int, limit: int = 10) -> List[sqlite3.Row]:
    """Get files changed in a session."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT filepath, context, lines_changed, timestamp
        FROM file_changes
        WHERE session_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
    ''', (session_id, limit))

    results = cursor.fetchall()
    conn.close()
    return results


def get_session_commands(session_id: int, limit: int = 10) -> List[sqlite3.Row]:
    """Get commands from a session."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT command, exit_code, cwd, timestamp
        FROM commands
        WHERE session_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
    ''', (session_id, limit))

    results = cursor.fetchall()
    conn.close()
    return results


def get_sessions_by_date(date: datetime, limit: int = 10) -> List[sqlite3.Row]:
    """Get sessions from a specific date."""
    conn = get_connection()
    cursor = conn.cursor()

    date_str = date.strftime('%Y-%m-%d')

    cursor.execute('''
        SELECT id, repo_path, branch, started_at, ended_at, last_active
        FROM sessions
        WHERE date(started_at) = ?
        ORDER BY started_at DESC
        LIMIT ?
    ''', (date_str, limit))

    results = cursor.fetchall()
    conn.close()
    return results


def get_sessions_by_branch(branch: str, limit: int = 10) -> List[sqlite3.Row]:
    """Get sessions for a specific branch."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT id, repo_path, branch, started_at, ended_at, last_active
        FROM sessions
        WHERE branch LIKE ?
        ORDER BY started_at DESC
        LIMIT ?
    ''', (f'%{branch}%', limit))

    results = cursor.fetchall()
    conn.close()
    return results


def get_recent_sessions(limit: int = 10) -> List[sqlite3.Row]:
    """Get recent sessions."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT id, repo_path, branch, started_at, ended_at, last_active
        FROM sessions
        ORDER BY started_at DESC
        LIMIT ?
    ''', (limit,))

    results = cursor.fetchall()
    conn.close()
    return results
