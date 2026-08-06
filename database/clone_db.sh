#!/usr/bin/env bash

set -e

# ==========================================================
# PostgreSQL Configuration
# ==========================================================
PGHOST="localhost"
PGPORT="5432"
PGUSER="postgres"

# Set password if required
# export PGPASSWORD="MyPassword123"
export PGPASSWORD=""

TARGET_DB="mms"
TEMPLATE_DB="icpwi"

# ==========================================================
# Locate psql
# ==========================================================
PSQL=$(command -v psql)

if [ -z "$PSQL" ]; then
    echo "ERROR: psql not found."
    exit 1
fi

echo
echo "============================================"
echo "PostgreSQL Database Clone Utility"
echo "============================================"
echo "Target Database : $TARGET_DB"
echo "Template Database : $TEMPLATE_DB"
echo

# ==========================================================
# Disable new connections
# ==========================================================
echo "Disabling new connections..."

"$PSQL" \
    -h "$PGHOST" \
    -p "$PGPORT" \
    -U "$PGUSER" \
    -d postgres \
    -v ON_ERROR_STOP=1 \
    -c "ALTER DATABASE \"$TARGET_DB\" WITH ALLOW_CONNECTIONS false;"

echo
echo "Terminating active connections..."

"$PSQL" \
    -h "$PGHOST" \
    -p "$PGPORT" \
    -U "$PGUSER" \
    -d postgres \
    -v ON_ERROR_STOP=1 \
    -c "SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname='$TARGET_DB'
        AND pid <> pg_backend_pid();"

echo
echo "Dropping database..."

"$PSQL" \
    -h "$PGHOST" \
    -p "$PGPORT" \
    -U "$PGUSER" \
    -d postgres \
    -v ON_ERROR_STOP=1 \
    -c "DROP DATABASE \"$TARGET_DB\";"

echo
echo "Database dropped."

echo
echo "Creating database from template..."

"$PSQL" \
    -h "$PGHOST" \
    -p "$PGPORT" \
    -U "$PGUSER" \
    -d postgres \
    -v ON_ERROR_STOP=1 \
    -c "CREATE DATABASE \"$TARGET_DB\" WITH TEMPLATE \"$TEMPLATE_DB\" OWNER postgres;"

echo
echo "Running move_to_source.sql..."

"$PSQL" \
    -h "$PGHOST" \
    -p "$PGPORT" \
    -U "$PGUSER" \
    -d "$TARGET_DB" \
    -v ON_ERROR_STOP=1 \
    -f move_to_source.sql

echo
echo "============================================"
echo "Database cloned successfully."
echo "============================================"