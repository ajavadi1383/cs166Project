#!/bin/bash
# Start the local PostgreSQL server (does nothing if it is already running).
set -e

export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
PGDATA="/opt/homebrew/var/postgresql@16"

if pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
  echo "PostgreSQL is already running."
else
  pg_ctl -D "$PGDATA" -l "$PGDATA/server.log" start
fi
