#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="mms"
DB_USER="postgres"
DB_PASSWORD="${PGPASSWORD:-}"

# Command line arguments
[[ $# -ge 1 ]] && DB_NAME="$1"
[[ $# -ge 2 ]] && DB_USER="$2"
[[ $# -ge 3 ]] && DB_HOST="$3"
[[ $# -ge 4 ]] && DB_PORT="$4"

export PGPASSWORD="$DB_PASSWORD"

# Check psql
if ! command -v psql >/dev/null 2>&1; then
    echo "PostgreSQL client (psql) was not found."
    echo "Install it using:"
    echo "sudo apt install postgresql-client"
    exit 1
fi

# Check pg_isready
if ! command -v pg_isready >/dev/null 2>&1; then
    echo "pg_isready was not found."
    echo "Install it using:"
    echo "sudo apt install postgresql-client"
    exit 1
fi

echo "Deploying SQL files from: $SCRIPT_DIR"
echo "Database: $DB_NAME @ $DB_HOST:$DB_PORT as $DB_USER"

echo "Checking PostgreSQL connection..."

if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
    echo "PostgreSQL is not accepting connections."
    exit 1
fi

echo "Connection OK."

# Check if database exists
DB_EXISTS=$(psql \
    -v ON_ERROR_STOP=1 \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d postgres \
    -At \
    -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';")

if [[ -z "$DB_EXISTS" ]]; then
    echo "Creating database $DB_NAME..."

    psql \
        -v ON_ERROR_STOP=1 \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d postgres \
        -c "CREATE DATABASE \"$DB_NAME\";"
fi

apply_sql_folder() {
    local folder="$1"

    [[ -d "$folder" ]] || return

    find "$folder" -type f -name "*.sql" | sort | while read -r sqlfile
    do
        echo "Applying $sqlfile"

        psql \
            -v ON_ERROR_STOP=1 \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -f "$sqlfile"
    done
}

apply_sql_folder "$SCRIPT_DIR/migrations"
apply_sql_folder "$SCRIPT_DIR/seeds"

echo
echo "Deployment completed successfully."