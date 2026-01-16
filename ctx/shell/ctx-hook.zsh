# ctx shell hooks for zsh
# Source this file in your .zshrc: source /path/to/ctx-hook.zsh

# Track the last command for logging
_ctx_last_command=""

# Called before each command executes
ctx_preexec() {
    _ctx_last_command="$1"
}

# Called after each command completes
ctx_precmd() {
    local exit_code=$?

    # Log the command if we have one
    if [[ -n "$_ctx_last_command" ]]; then
        # Run in background to not slow down prompt
        (ctx-log-command "$_ctx_last_command" "$exit_code" 2>/dev/null &)
    fi

    _ctx_last_command=""
}

# Register hooks
autoload -Uz add-zsh-hook
add-zsh-hook preexec ctx_preexec
add-zsh-hook precmd ctx_precmd

# Convenience alias
alias ctx='python3 -m ctx.cli'
