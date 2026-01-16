# ctx - Working Context Tracker

A simple tool that tracks what you're doing in git repos so you can pick up where you left off.

No AI. No cloud. Just local SQLite tracking your files and commands.

## What it does

- Tracks which files you edit in git repos
- Records your shell commands (filters out sensitive ones)
- Saves context snippets from your last edits
- Lets you see what you were doing yesterday, or on a specific branch

## Install

```bash
cd ctx
pip install -e .
```

## Setup

Add to your `~/.zshrc`:

```bash
# Start the tracker in background (once per terminal)
ctx-track &>/dev/null &

# Source the shell hooks for command tracking
source /path/to/ctx/shell/ctx-hook.zsh
```

Or for bash, add to `~/.bashrc`:

```bash
ctx-track &>/dev/null &
source /path/to/ctx/shell/ctx-hook.bash
```

## Usage

```bash
# Show current context - what am I working on?
ctx

# What was I doing yesterday?
ctx --yesterday

# List recent sessions
ctx --list

# Find sessions where I worked on a branch
ctx --branch feat/auth

# Start a fresh session
ctx --new
```

## Example output

```
==================================================
 CONTEXT: feat/user-auth (myproject)
 Session: 2h 14m ago
==================================================

 Branch:  feat/user-auth
 Repo:    /home/user/myproject

 Files modified:
   src/auth.py (+12 edits) @ 14:45
   tests/test_auth.py (+8 edits) @ 14:52

 Last edit context (src/auth.py):
   def validate_token(token):
       # TODO: handle expired tokens
       return jwt.decode(token, SECRET)

 Recent commands:
   [x1] pytest tests/test_auth.py -v @ 14:50
   [ok] pytest tests/test_auth.py -v @ 14:53

==================================================
```

## Privacy

- All data stored locally in `~/.ctx/sessions.db`
- Commands with passwords/tokens/secrets are not logged
- No network calls, no telemetry

## License

MIT
