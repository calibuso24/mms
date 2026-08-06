#!/usr/bin/env bash

set -euo pipefail

# ==========================================================
# Script Directory
# ==========================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ==========================================================
# Database Configuration
# ==========================================================
DB_HOST="${3:-localhost}"
DB_PORT="${4:-5432}"
DB_NAME="${1:-mms}"
DB_USER="${2:-postgres}"
DB_PASSWORD="${PGPASSWORD:-}"

export PGPASSWORD="$DB_PASSWORD"

# ==========================================================
# Locate PostgreSQL tools
# ==========================================================
PSQL_EXE=$(command -v psql || true)
PG_ISREADY_EXE=$(command -v pg_isready || true)

if [[ -z "$PSQL_EXE" ]]; then
    echo "ERROR: PostgreSQL client (psql) was not found."
    echo "Install PostgreSQL client first."
    exit 1
fi

if [[ -z "$PG_ISREADY_EXE" ]]; then
    echo "WARNING: pg_isready not found."
    PG_ISREADY_EXE="$PSQL_EXE"
fi

echo
echo "==============================================="
echo "PostgreSQL Migration Utility"
echo "==============================================="
echo "Script     : $SCRIPT_DIR"
echo "Database   : $DB_NAME"
echo "Host       : $DB_HOST"
echo "Port       : $DB_PORT"
echo "User       : $DB_USER"
echo

# ==========================================================
# Check Connection
# ==========================================================
echo "Checking PostgreSQL connection..."

if command -v pg_isready >/dev/null 2>&1; then
    if ! "$PG_ISREADY_EXE" -h "$DB_HOST" -p "$DB_PORT" >/dev/null; then
        echo "ERROR: PostgreSQL is not accepting connections."
        exit 1
    fi
else
    "$PSQL_EXE" \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d postgres \
        -c '\q' >/dev/null
fi

echo "Connection OK."
echo

# ==========================================================
# Apply SQL Files
# ==========================================================

IMPORT_DIR="$SCRIPT_DIR/import"

if [[ ! -d "$IMPORT_DIR" ]]; then
    echo "No import directory found."
    exit 1
fi

find "$IMPORT_DIR" -type f -name "*.sql" | sort | while read -r file
do
    echo "Applying $file"

    "$PSQL_EXE" \
        -v ON_ERROR_STOP=1 \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -f "$file"

    echo "✓ $(basename "$file")"
done

echo
echo "==============================================="
echo "Migration completed successfully."
echo "==============================================="