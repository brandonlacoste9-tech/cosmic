# ctx shell hooks for bash
# Source this file in your .bashrc: source /path/to/ctx-hook.bash

# Track commands using DEBUG trap
_ctx_last_command=""

_ctx_debug_trap() {
    _ctx_last_command="$BASH_COMMAND"
}

_ctx_prompt_command() {
    local exit_code=$?

    if [[ -n "$_ctx_last_command" ]]; then
        # Run in background to not slow down prompt
        (ctx-log-command "$_ctx_last_command" "$exit_code" 2>/dev/null &)
    fi

    _ctx_last_command=""
}

# Set up traps
trap '_ctx_debug_trap' DEBUG

# Append to existing PROMPT_COMMAND
if [[ -z "$PROMPT_COMMAND" ]]; then
    PROMPT_COMMAND="_ctx_prompt_command"
else
    PROMPT_COMMAND="_ctx_prompt_command;$PROMPT_COMMAND"
fi

# Convenience alias
alias ctx='python3 -m ctx.cli'
