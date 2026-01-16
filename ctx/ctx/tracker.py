"""Background tracker for ctx - monitors git repos and file changes."""

import os
import subprocess
import time
import signal
import sys
from pathlib import Path
from typing import Optional, Tuple
from datetime import datetime, timedelta

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileModifiedEvent

from .db import (
    init_db, get_current_session, start_session,
    update_session_activity, record_file_change
)

# How often to check git status (seconds)
POLL_INTERVAL = 30

# Inactivity threshold for new session (minutes)
INACTIVITY_THRESHOLD = 45

# File patterns to ignore
IGNORE_PATTERNS = {
    '.git', '__pycache__', 'node_modules', '.pytest_cache',
    '.mypy_cache', '.tox', 'venv', '.venv', 'dist', 'build',
    '*.pyc', '*.pyo', '*.egg-info', '.DS_Store', '*.swp', '*.swo'
}


def should_ignore_path(path: str) -> bool:
    """Check if a path should be ignored."""
    path_parts = Path(path).parts
    for part in path_parts:
        if part in IGNORE_PATTERNS:
            return True
        for pattern in IGNORE_PATTERNS:
            if pattern.startswith('*') and part.endswith(pattern[1:]):
                return True
    return False


def get_git_info(cwd: Optional[str] = None) -> Tuple[Optional[str], Optional[str]]:
    """Get the git repo root and current branch."""
    try:
        repo = subprocess.run(
            ['git', 'rev-parse', '--show-toplevel'],
            capture_output=True, text=True, cwd=cwd
        )
        if repo.returncode != 0:
            return None, None

        repo_path = repo.stdout.strip()

        branch = subprocess.run(
            ['git', 'branch', '--show-current'],
            capture_output=True, text=True, cwd=cwd
        )
        branch_name = branch.stdout.strip() if branch.returncode == 0 else None

        return repo_path, branch_name
    except Exception:
        return None, None


def get_file_context(filepath: str, max_lines: int = 6) -> str:
    """Get the last few lines of a file as context."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        return ''.join(lines[-max_lines:]) if lines else ""
    except Exception:
        return ""


def get_relative_path(filepath: str, repo_root: str) -> str:
    """Get the path relative to repo root."""
    try:
        return os.path.relpath(filepath, repo_root)
    except ValueError:
        return filepath


class FileChangeHandler(FileSystemEventHandler):
    """Handle file system events and record changes."""

    def __init__(self, session_id: int, repo_root: str):
        self.session_id = session_id
        self.repo_root = repo_root
        super().__init__()

    def on_modified(self, event: FileModifiedEvent) -> None:
        if event.is_directory:
            return

        filepath = event.src_path

        if should_ignore_path(filepath):
            return

        rel_path = get_relative_path(filepath, self.repo_root)
        context = get_file_context(filepath)

        record_file_change(
            session_id=self.session_id,
            filepath=rel_path,
            context=context,
            lines_changed=1  # Simplified - could count actual changes
        )
        update_session_activity(self.session_id)


class ContextTracker:
    """Main tracker that monitors git context and file changes."""

    def __init__(self):
        self.current_repo: Optional[str] = None
        self.current_branch: Optional[str] = None
        self.session_id: Optional[int] = None
        self.observer: Optional[Observer] = None
        self.last_activity: datetime = datetime.now()
        self.running = False

    def check_inactivity(self) -> bool:
        """Check if we've been inactive long enough to start a new session."""
        if not self.session_id:
            return False

        inactive_time = datetime.now() - self.last_activity
        return inactive_time > timedelta(minutes=INACTIVITY_THRESHOLD)

    def update_context(self) -> None:
        """Check current git context and update session if needed."""
        repo, branch = get_git_info()

        if not repo:
            # Not in a git repo
            if self.observer and self.observer.is_alive():
                self.observer.stop()
                self.observer = None
            return

        # Check if we need a new session
        needs_new_session = (
            repo != self.current_repo or
            branch != self.current_branch or
            self.check_inactivity()
        )

        if needs_new_session:
            self.start_new_session(repo, branch)

        if self.session_id:
            update_session_activity(self.session_id)
            self.last_activity = datetime.now()

    def start_new_session(self, repo: str, branch: Optional[str]) -> None:
        """Start a new tracking session."""
        # Stop watching old repo
        if self.observer and self.observer.is_alive():
            self.observer.stop()
            self.observer.join(timeout=2)

        # Start new session in DB
        self.session_id = start_session(repo, branch)
        self.current_repo = repo
        self.current_branch = branch
        self.last_activity = datetime.now()

        print(f"[ctx] New session: {branch} in {Path(repo).name}")

        # Start watching new repo
        self.observer = Observer()
        handler = FileChangeHandler(self.session_id, repo)
        self.observer.schedule(handler, repo, recursive=True)
        self.observer.start()

    def run(self) -> None:
        """Main tracking loop."""
        init_db()
        self.running = True

        print("[ctx] Tracker started. Press Ctrl+C to stop.")

        def signal_handler(sig, frame):
            print("\n[ctx] Stopping tracker...")
            self.running = False

        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

        try:
            while self.running:
                self.update_context()
                time.sleep(POLL_INTERVAL)
        finally:
            if self.observer and self.observer.is_alive():
                self.observer.stop()
                self.observer.join(timeout=2)
            print("[ctx] Tracker stopped.")


def run_tracker() -> None:
    """Entry point for the tracker daemon."""
    tracker = ContextTracker()
    tracker.run()


if __name__ == '__main__':
    run_tracker()
