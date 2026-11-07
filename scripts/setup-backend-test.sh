#!/bin/bash
# Isolated fixture setup for the provider E2E suite.
# Uses the PostgreSQL that is already running. Does not drop the database
# and does not read the backend .env.test (that file can point Celery at Redis).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="${BACKEND_DIR:-/tmp/mecanimovil-backend}"
DB_NAME="${DB_NAME:-mecanimovil_test}"
DB_USER="${DB_USER:-mecani_test}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
MANIFEST="${FIXTURE_MANIFEST:-$ROOT/e2e/fixture-manifest.json}"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is not installed."
  exit 1
fi

postgres_ready() {
  sudo -n -u postgres psql -c "SELECT 1" >/dev/null 2>&1
}

if ! postgres_ready; then
  ver=""
  if [ -d /usr/lib/postgresql ]; then
    ver="$(ls /usr/lib/postgresql | sort -n | tail -1)"
  fi
  if [ -n "$ver" ] && command -v pg_ctlcluster >/dev/null 2>&1; then
    sudo pg_ctlcluster "$ver" main start
  elif command -v service >/dev/null 2>&1; then
    sudo service postgresql start
  else
    echo "PostgreSQL is not accepting connections and there is no cluster to start."
    exit 1
  fi
fi

for _ in $(seq 1 30); do
  if postgres_ready; then
    break
  fi
  sleep 1
done
postgres_ready

sudo -n -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD 'test123';
  END IF;
END
\$\$;
SQL

if ! sudo -n -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1; then
  sudo -n -u postgres createdb -O "$DB_USER" "$DB_NAME"
fi

sudo -n -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 <<SQL
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
GRANT ALL ON SCHEMA public TO ${DB_USER};
ALTER SCHEMA public OWNER TO ${DB_USER};
SQL

if [ ! -x "$BACKEND_DIR/venv/bin/python" ]; then
  if ! python3 -m venv "$BACKEND_DIR/venv"; then
    sudo apt-get update
    sudo apt-get install -y python3-venv
    rm -rf "$BACKEND_DIR/venv"
    python3 -m venv "$BACKEND_DIR/venv"
  fi
fi

# shellcheck disable=SC1091
source "$BACKEND_DIR/venv/bin/activate"
if ! python -c "import django" >/dev/null 2>&1; then
  python -m pip install --upgrade pip
  python -m pip install -r "$BACKEND_DIR/requirements.txt"
fi

unset REDIS_URL CELERY_BROKER_URL CELERY_RESULT_BACKEND
export BACKEND_DIR
export DATABASE_URL="postgis://${DB_USER}:test123@${DB_HOST}:${DB_PORT}/${DB_NAME}"
export DEBUG=True
export SECURE_SSL_REDIRECT=False
export ASISTENTE_COTIZACION_IA_ENABLED=False
export BUSQUEDA_WEB_REPUESTOS_ENABLED=False
export OMNICHANNEL_ENABLED=False
export WHATSAPP_TEMPLATES_ENABLED=False
export GDAL_LIBRARY_PATH="${GDAL_LIBRARY_PATH:-/usr/lib/x86_64-linux-gnu/libgdal.so}"
export SECRET_KEY="${SECRET_KEY:-test-secret-key-for-ci-only-never-use-in-production}"
export FIXTURE_MANIFEST="$MANIFEST"
export FIXTURE_DATABASE_NAME="$DB_NAME"

(
  cd "$BACKEND_DIR"
  python "$ROOT/scripts/isolated_backend.py" migrate --noinput
  python "$ROOT/scripts/seed_isolated_fixtures.py"
)

echo "Fixtures ready. Manifest: $MANIFEST"
echo "Backend SHA: $(git -C "$BACKEND_DIR" rev-parse HEAD)"
echo "API: DATABASE_URL for ${DB_NAME}, DEBUG=True, SECURE_SSL_REDIRECT=False."
echo "Start it with: python $ROOT/scripts/isolated_backend.py runserver 0.0.0.0:8010"
echo "Do not source .env.test."
