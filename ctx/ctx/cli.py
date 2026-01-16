"""CLI interface for ctx - the main user-facing commands."""

import argparse
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from . import __version__
from .db import (
    init_db, get_current_session, end_current_session,
    get_session_files, get_session_commands,
    get_sessions_by_date, get_sessions_by_branch, get_recent_sessions
)


def format_timestamp(ts_str: str) -> str:
    """Format a timestamp string to HH:MM."""
    try:
        dt = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
        return dt.strftime('%H:%M')
    except Exception:
        return ts_str[:5] if ts_str else "??:??"


def format_duration(start_str: str, end_str: Optional[str] = None) -> str:
    """Format duration between two timestamps."""
    try:
        start = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
        end = datetime.fromisoformat(end_str.replace('Z', '+00:00')) if end_str else datetime.now()
        delta = end - start
        hours = int(delta.total_seconds() // 3600)
        minutes = int((delta.total_seconds() % 3600) // 60)
        if hours > 0:
            return f"{hours}h {minutes}m"
        return f"{minutes}m"
    except Exception:
        return "??m"


def print_separator(char: str = '-', width: int = 50) -> None:
    """Print a separator line."""
    print(char * width)


def show_current() -> int:
    """Show the current session context."""
    init_db()

    session = get_current_session()
    if not session:
        print("No active session.")
        print("Start the tracker with: ctx --track")
        return 1

    sid = session['id']
    repo_path = session['repo_path']
    branch = session['branch'] or 'detached'
    started = session['started_at']
    last_active = session['last_active']

    repo_name = Path(repo_path).name if repo_path else "unknown"
    duration = format_duration(started)

    # Get files and commands
    files = get_session_files(sid, limit=5)
    commands = get_session_commands(sid, limit=5)

    # Print output
    print_separator('=')
    print(f" CONTEXT: {branch} ({repo_name})")
    print(f" Session: {duration} ago")
    print_separator('=')

    print(f"\n Branch:  {branch}")
    print(f" Repo:    {repo_path}")

    if files:
        print(f"\n Files modified:")
        for f in files:
            filepath = f['filepath']
            ts = format_timestamp(f['timestamp'])
            lines = f['lines_changed'] or 0
            print(f"   {filepath} (+{lines} edits) @ {ts}")

        # Show context from most recent file
        if files[0]['context']:
            print(f"\n Last edit context ({files[0]['filepath']}):")
            context_lines = files[0]['context'].strip().split('\n')
            for line in context_lines[-3:]:  # Show last 3 lines
                print(f"   {line}")

    if commands:
        print(f"\n Recent commands:")
        for cmd in reversed(list(commands)[-5:]):  # Show oldest to newest
            command = cmd['command']
            exit_code = cmd['exit_code']
            ts = format_timestamp(cmd['timestamp'])

            # Truncate long commands
            if len(command) > 45:
                command = command[:42] + "..."

            status = "ok" if exit_code == 0 else f"x{exit_code}"
            print(f"   [{status}] {command} @ {ts}")

    print_separator('=')
    return 0


def show_yesterday() -> int:
    """Show yesterday's sessions."""
    init_db()

    yesterday = datetime.now() - timedelta(days=1)
    sessions = get_sessions_by_date(yesterday, limit=5)

    if not sessions:
        print(f"No sessions found for {yesterday.strftime('%Y-%m-%d')}.")
        return 1

    print_separator('=')
    print(f" SESSIONS: {yesterday.strftime('%A, %B %d')}")
    print_separator('=')

    for s in sessions:
        repo_name = Path(s['repo_path']).name if s['repo_path'] else "?"
        branch = s['branch'] or 'detached'
        started = format_timestamp(s['started_at'])
        duration = format_duration(s['started_at'], s['ended_at'])

        print(f"\n [{started}] {branch} ({repo_name}) - {duration}")

        # Show files for this session
        files = get_session_files(s['id'], limit=3)
        if files:
            for f in files:
                print(f"   - {f['filepath']}")

    print_separator('=')
    return 0


def show_list(limit: int = 10) -> int:
    """List recent sessions."""
    init_db()

    sessions = get_recent_sessions(limit=limit)

    if not sessions:
        print("No sessions found.")
        return 1

    print_separator('=')
    print(f" RECENT SESSIONS (last {limit})")
    print_separator('=')

    current_date = None
    for s in sessions:
        # Get the date
        try:
            dt = datetime.fromisoformat(s['started_at'].replace('Z', '+00:00'))
            date_str = dt.strftime('%Y-%m-%d')
        except Exception:
            date_str = "unknown"

        # Print date header if changed
        if date_str != current_date:
            current_date = date_str
            print(f"\n {date_str}")
            print(" " + "-" * 40)

        repo_name = Path(s['repo_path']).name if s['repo_path'] else "?"
        branch = s['branch'] or 'detached'
        started = format_timestamp(s['started_at'])
        duration = format_duration(s['started_at'], s['ended_at'])
        active = " *" if s['ended_at'] is None else ""

        print(f"   [{started}] {branch:20} ({repo_name}) {duration}{active}")

    print_separator('=')
    return 0


def show_branch(branch_name: str) -> int:
    """Show sessions for a specific branch."""
    init_db()

    sessions = get_sessions_by_branch(branch_name, limit=10)

    if not sessions:
        print(f"No sessions found for branch matching '{branch_name}'.")
        return 1

    print_separator('=')
    print(f" SESSIONS: branch ~ {branch_name}")
    print_separator('=')

    for s in sessions:
        repo_name = Path(s['repo_path']).name if s['repo_path'] else "?"
        branch = s['branch'] or 'detached'

        try:
            dt = datetime.fromisoformat(s['started_at'].replace('Z', '+00:00'))
            date_str = dt.strftime('%Y-%m-%d %H:%M')
        except Exception:
            date_str = s['started_at']

        duration = format_duration(s['started_at'], s['ended_at'])
        print(f"\n {date_str} - {duration}")
        print(f"   Branch: {branch}")
        print(f"   Repo:   {repo_name}")

        # Show files
        files = get_session_files(s['id'], limit=3)
        if files:
            print("   Files:")
            for f in files:
                print(f"     - {f['filepath']}")

    print_separator('=')
    return 0


def start_new_session() -> int:
    """Explicitly start a new session."""
    init_db()

    if end_current_session():
        print("Previous session ended.")

    print("New session will start when tracker detects activity.")
    print("Make sure the tracker is running: ctx --track")
    return 0


def run_tracker() -> int:
    """Run the background tracker."""
    from .tracker import run_tracker as _run_tracker
    _run_tracker()
    return 0


def main() -> None:
    """Main entry point for ctx CLI."""
    parser = argparse.ArgumentParser(
        prog='ctx',
        description='Working context tracker - remember what you were doing',
        epilog=f'ctx version {__version__}'
    )

    parser.add_argument(
        '--version', '-v',
        action='version',
        version=f'ctx {__version__}'
    )

    parser.add_argument(
        '--yesterday', '-y',
        action='store_true',
        help="Show yesterday's sessions"
    )

    parser.add_argument(
        '--list', '-l',
        action='store_true',
        help='List recent sessions'
    )

    parser.add_argument(
        '--branch', '-b',
        metavar='NAME',
        help='Find sessions for a branch'
    )

    parser.add_argument(
        '--new', '-n',
        action='store_true',
        help='Start a new session'
    )

    parser.add_argument(
        '--track', '-t',
        action='store_true',
        help='Run the background tracker (usually started automatically)'
    )

    args = parser.parse_args()

    # Route to appropriate command
    if args.track:
        sys.exit(run_tracker())
    elif args.new:
        sys.exit(start_new_session())
    elif args.yesterday:
        sys.exit(show_yesterday())
    elif args.list:
        sys.exit(show_list())
    elif args.branch:
        sys.exit(show_branch(args.branch))
    else:
        sys.exit(show_current())


if __name__ == '__main__':
    main()
