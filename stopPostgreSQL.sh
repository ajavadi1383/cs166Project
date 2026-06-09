#!/bin/bash
# Stop the local PostgreSQL server.
set -e

export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
PGDATA="/opt/homebrew/var/postgresql@16"

pg_ctl -D "$PGDATA" stop
