"""Command logging for ctx - records shell commands."""

import os
import sys
from pathlib import Path
from typing import List

from .db import init_db, get_current_session, record_command
from .tracker import get_git_info

# Commands that are too trivial to log
TRIVIAL_COMMANDS = {
    '', 'cd', 'ls', 'pwd', 'clear', 'exit', 'history',
    'echo', 'cat', 'less', 'more', 'man', 'help'
}

# Patterns that indicate sensitive content (case-insensitive)
SENSITIVE_PATTERNS = [
    'password', 'passwd', 'secret', 'token', 'api_key',
    'apikey', 'auth', 'credential', 'private_key'
]


def should_log_command(cmd: str) -> bool:
    """Determine if a command should be logged."""
    if not cmd or not cmd.strip():
        return False

    # Get the base command (first word)
    parts = cmd.strip().split()
    if not parts:
        return False

    base_cmd = parts[0].lower()

    # Skip trivial commands
    if base_cmd in TRIVIAL_COMMANDS:
        return False

    # Skip commands with sensitive patterns
    cmd_lower = cmd.lower()
    for pattern in SENSITIVE_PATTERNS:
        if pattern in cmd_lower:
            return False

    # Skip export/set commands that might contain secrets
    if base_cmd in ('export', 'set') and '=' in cmd:
        for pattern in SENSITIVE_PATTERNS:
            if pattern in cmd_lower:
                return False

    return True


def log_command(command: str, exit_code: int) -> bool:
    """
    Log a command to the current session.
    Called by shell hooks.
    Returns True if logged, False if skipped.
    """
    if not should_log_command(command):
        return False

    init_db()

    session = get_current_session()
    if not session:
        return False

    # Get current working directory
    cwd = os.getcwd()

    # Only log if we're in a git repo
    repo, _ = get_git_info(cwd)
    if not repo:
        return False

    record_command(
        session_id=session['id'],
        command=command,
        exit_code=exit_code,
        cwd=cwd
    )

    return True


def main() -> None:
    """Entry point for ctx-log-command script."""
    if len(sys.argv) < 3:
        sys.exit(1)

    command = sys.argv[1]
    try:
        exit_code = int(sys.argv[2])
    except ValueError:
        exit_code = 1

    log_command(command, exit_code)


if __name__ == '__main__':
    main()
