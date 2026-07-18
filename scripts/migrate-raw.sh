#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_URL="${DATABASE_URL:-postgresql://admin:secret@localhost:5432/takelow_db}"

echo "  → Running raw SQL migrations against $DB_URL"

for f in "$ROOT/database/migrations/"*.sql; do
  name="$(basename "$f")"
  echo "    $name"
  psql "$DB_URL" -q -f "$f" 2>&1 | grep -v "^CREATE$\|^ALTER$\|^INSERT\|^$" || true
done

echo "  ✓ All migrations applied"
