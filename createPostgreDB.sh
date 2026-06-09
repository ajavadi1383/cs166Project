#!/bin/bash
# Create the auction database and load the schema, indexes and sample data.
set -e

export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
DB_NAME="auction_db"

echo "Creating database '$DB_NAME'..."
createdb "$DB_NAME" 2>/dev/null || echo "Database '$DB_NAME' already exists, reloading."

psql -d "$DB_NAME" -f sql/schema.sql
psql -d "$DB_NAME" -f sql/indexes.sql
psql -d "$DB_NAME" -f sql/seed_data.sql

echo "Database setup complete."
