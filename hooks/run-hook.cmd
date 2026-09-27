: << 'CMDBLOCK'
@echo off
REM Runs a hook script with bash on Windows, macOS and Linux.
REM On Windows, cmd.exe runs this batch part, which finds Git Bash and calls it.
REM On Unix, the shell reads the file as a script (":" is a no-op) and runs the part at the end.
REM Hook scripts have no extension, so Claude Code's Windows handling of .sh commands stays out of it.
REM Same approach as the superpowers plugin (github.com/obra/superpowers, MIT).
REM Usage: run-hook.cmd <script-name>

if "%~1"=="" (
    echo run-hook.cmd: missing script name >&2
    exit /b 1
)

set "HOOK_DIR=%~dp0"

if exist "C:\Program Files\Git\bin\bash.exe" (
    "C:\Program Files\Git\bin\bash.exe" "%HOOK_DIR%%~1"
    exit /b %ERRORLEVEL%
)
if exist "C:\Program Files (x86)\Git\bin\bash.exe" (
    "C:\Program Files (x86)\Git\bin\bash.exe" "%HOOK_DIR%%~1"
    exit /b %ERRORLEVEL%
)

where bash >nul 2>nul
if %ERRORLEVEL% equ 0 (
    bash "%HOOK_DIR%%~1"
    exit /b %ERRORLEVEL%
)

REM No bash: exit quietly. The agents still install; only the session-start line is missing.
exit /b 0
CMDBLOCK

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec bash "${SCRIPT_DIR}/$1"
