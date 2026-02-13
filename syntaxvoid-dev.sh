#!/bin/bash
# SyntaxVoid Dev CLI

# Ensure we are in the correct directory or allow invoking from anywhere
REPO_DIR="$(dirname "$(realpath "$0")")"

# Execute electron with the current directory
# -f keeps it in foreground to see logs, which is useful for dev.
# Pass all arguments to the application.
"$REPO_DIR/node_modules/.bin/electron" --no-sandbox --enable-logging "$REPO_DIR" -f "$@"
