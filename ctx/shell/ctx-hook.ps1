# ctx shell hooks for PowerShell
# Add this to your PowerShell profile: . "C:\path\to\ctx-hook.ps1"
#
# To find your profile location, run: $PROFILE
# To create it if it doesn't exist: New-Item -Path $PROFILE -ItemType File -Force

# Store the original prompt function
$script:OriginalPrompt = $function:prompt

# Track the last command for logging
$script:LastExitCode = 0

function prompt {
    # Get the last command's exit status
    $script:LastExitCode = $LASTEXITCODE
    if ($null -eq $script:LastExitCode) { $script:LastExitCode = 0 }

    # Get the last command from history
    $lastCmd = Get-History -Count 1 -ErrorAction SilentlyContinue

    if ($lastCmd) {
        # Only log if this is a new command (not the same ID as before)
        if ($script:LastHistoryId -ne $lastCmd.Id) {
            $script:LastHistoryId = $lastCmd.Id
            $cmdText = $lastCmd.CommandLine

            # Log the command in background (don't slow down prompt)
            Start-Job -ScriptBlock {
                param($cmd, $exitCode)
                ctx-log-command $cmd $exitCode 2>$null
            } -ArgumentList $cmdText, $script:LastExitCode | Out-Null

            # Clean up old jobs to prevent memory buildup
            Get-Job -State Completed | Remove-Job -ErrorAction SilentlyContinue
        }
    }

    # Call the original prompt or default
    if ($script:OriginalPrompt) {
        & $script:OriginalPrompt
    } else {
        "PS $($executionContext.SessionState.Path.CurrentLocation)$('>' * ($nestedPromptLevel + 1)) "
    }
}

# Initialize the history tracker
$script:LastHistoryId = (Get-History -Count 1 -ErrorAction SilentlyContinue).Id

# Convenience alias
Set-Alias -Name ctx -Value ctx.exe -ErrorAction SilentlyContinue

Write-Host "[ctx] PowerShell hooks loaded. Commands will be tracked." -ForegroundColor Cyan
