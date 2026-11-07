#!/bin/bash
set -e

echo "🚀 Setting up backend test environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKEND_DIR="/tmp/mecanimovil-backend"
DB_NAME="mecanimovil_test"
DB_USER="mecani_test"
DB_PASSWORD="test123"
DB_HOST="localhost"
DB_PORT="5432"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL not found. Installing...${NC}"
    sudo apt-get update
    sudo apt-get install -y postgresql postgresql-contrib postgis gdal-bin libgdal-dev python3-gdal
fi

# Check if PostgreSQL is running
if ! sudo systemctl is-active --quiet postgresql 2>/dev/null; then
    # Try alternative methods if systemd is not available
    if command -v pg_ctlcluster &> /dev/null; then
        echo -e "${YELLOW}Starting PostgreSQL with pg_ctlcluster...${NC}"
        sudo pg_ctlcluster 14 main start || sudo pg_ctlcluster 13 main start || sudo pg_ctlcluster 12 main start
    elif command -v service &> /dev/null; then
        echo -e "${YELLOW}Starting PostgreSQL with service...${NC}"
        sudo service postgresql start
    else
        echo -e "${RED}Cannot start PostgreSQL. systemd not available and no alternative found.${NC}"
        echo -e "${YELLOW}Trying manual start...${NC}"
        sudo -u postgres /usr/lib/postgresql/*/bin/pg_ctl -D /var/lib/postgresql/*/main -l /var/log/postgresql/logfile start || true
    fi
fi

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if sudo -u postgres psql -c "SELECT 1" &> /dev/null; then
        echo -e "${GREEN}PostgreSQL is ready!${NC}"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 1
done

# Create database and user
echo "Creating test database and user..."
sudo -u postgres psql <<EOF || echo "Database may already exist, continuing..."
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

# Add PostGIS extension
echo "Adding PostGIS extension..."
sudo -u postgres psql -d $DB_NAME <<EOF
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
ALTER SCHEMA public OWNER TO $DB_USER;
EOF

# Set up backend environment
cd $BACKEND_DIR

# Create .env.test file
echo "Creating .env.test file..."
cat > .env.test <<EOF
DATABASE_URL=postgis://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
SECRET_KEY=test-secret-key-for-ci-only-never-use-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,testserver,0.0.0.0
CELERY_TASK_ALWAYS_EAGER=True
CELERY_TASK_EAGER_PROPAGATES=True

# Disable external services
ASISTENTE_COTIZACION_IA_ENABLED=False
BUSQUEDA_WEB_REPUESTOS_ENABLED=False
SEND_EMAILS=False
SEND_SMS=False
SEND_PUSH_NOTIFICATIONS=False

# GDAL library
GDAL_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu/libgdal.so
EOF

# Create Python virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate venv and install dependencies
echo "Installing Python dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt || echo "Some dependencies may have failed, continuing..."

# Set GDAL library path
export GDAL_LIBRARY_PATH=$(find /usr/lib -name "libgdal.so*" | head -1)
echo "GDAL_LIBRARY_PATH=$GDAL_LIBRARY_PATH"

# Load test environment
export $(cat .env.test | xargs)

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Create superuser for testing
echo "Creating test superuser..."
python manage.py shell <<PYEOF || echo "Superuser may already exist"
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin_test').exists():
    User.objects.create_superuser('admin_test', 'admin@test.com', 'test123')
    print("Superuser created")
else:
    print("Superuser already exists")
PYEOF

# Create test fixtures
echo "Creating test fixtures..."
python manage.py shell <<PYEOF
from django.contrib.auth import get_user_model
from mecanimovilapp.apps.usuarios.models import Taller, MiembroTaller, Cliente
from mecanimovilapp.apps.ordenes.models import SolicitudServicio
from mecanimovilapp.apps.vehiculos.models import Vehiculo
from datetime import date, time, datetime, timedelta
import pytz

User = get_user_model()

# Create test workshop
taller_user, _ = User.objects.get_or_create(
    username='taller_test',
    defaults={
        'email': 'taller@test.com',
        'is_active': True
    }
)
if not taller_user.check_password('test123'):
    taller_user.set_password('test123')
    taller_user.save()

taller, _ = Taller.objects.get_or_create(
    usuario=taller_user,
    defaults={
        'nombre': 'Taller Test',
        'direccion': 'Av. Test 123',
        'telefono': '+56912345678',
        'estado': 'aprobado'
    }
)

# Create test mechanics
mecanico1_user, _ = User.objects.get_or_create(
    username='mecanico1_test',
    defaults={'email': 'mecanico1@test.com', 'is_active': True}
)
if not mecanico1_user.check_password('test123'):
    mecanico1_user.set_password('test123')
    mecanico1_user.save()

mecanico1, _ = MiembroTaller.objects.get_or_create(
    usuario=mecanico1_user,
    taller=taller,
    defaults={
        'nombre': 'Juan Pérez',
        'rol': 'mecanico',
        'activo': True,
        'modalidad': 'ambos',
    }
)

mecanico2_user, _ = User.objects.get_or_create(
    username='mecanico2_test',
    defaults={'email': 'mecanico2@test.com', 'is_active': True}
)
if not mecanico2_user.check_password('test123'):
    mecanico2_user.set_password('test123')
    mecanico2_user.save()

mecanico2, _ = MiembroTaller.objects.get_or_create(
    usuario=mecanico2_user,
    taller=taller,
    defaults={
        'nombre': 'Pedro González',
        'rol': 'mecanico',
        'activo': True,
        'modalidad': 'ambos',
    }
)

# Create test client
cliente_user, _ = User.objects.get_or_create(
    username='cliente_test',
    defaults={'email': 'cliente@test.com', 'is_active': True}
)
if not cliente_user.check_password('test123'):
    cliente_user.set_password('test123')
    cliente_user.save()

cliente, _ = Cliente.objects.get_or_create(
    usuario=cliente_user,
    defaults={
        'nombre': 'Cliente',
        'apellido': 'Test',
        'telefono': '+56987654321',
        'email': 'cliente@test.com'
    }
)

# Create test vehicle
vehiculo, _ = Vehiculo.objects.get_or_create(
    cliente=cliente,
    placa='AAAA00',
    defaults={
        'marca': 'Toyota',
        'modelo': 'Corolla',
        'año': 2020,
        'color': 'Blanco'
    }
)

# Create test orders
tz = pytz.timezone('America/Santiago')
tomorrow = date.today() + timedelta(days=1)

# Order 1: Pending acceptance
orden1, _ = SolicitudServicio.objects.get_or_create(
    id=1001,
    defaults={
        'cliente': cliente,
        'vehiculo': vehiculo,
        'tipo_servicio': 'taller',
        'taller': taller,
        'fecha_servicio': tomorrow,
        'hora_servicio': time(10, 0),
        'metodo_pago': 'efectivo',
        'total': 50000,
        'estado': 'pendiente_aceptacion_proveedor',
        'descripcion': 'Cambio de aceite y filtros',
        'direccion_servicio': 'Av. Test 123'
    }
)

# Order 2: Accepted, needs technician assignment
orden2, _ = SolicitudServicio.objects.get_or_create(
    id=1002,
    defaults={
        'cliente': cliente,
        'vehiculo': vehiculo,
        'tipo_servicio': 'taller',
        'taller': taller,
        'fecha_servicio': tomorrow,
        'hora_servicio': time(10, 30),
        'metodo_pago': 'efectivo',
        'total': 75000,
        'estado': 'aceptada_por_proveedor',
        'descripcion': 'Revisión de frenos',
        'direccion_servicio': 'Av. Test 123'
    }
)

print("✅ Test fixtures created successfully!")
print(f"  - Taller: {taller.nombre}")
print(f"  - Mecánico 1: {mecanico1.nombre}")
print(f"  - Mecánico 2: {mecanico2.nombre}")
print(f"  - Cliente: {cliente.nombre} {cliente.apellido}")
print(f"  - Vehículo: {vehiculo.marca} {vehiculo.modelo}")
print(f"  - Órdenes creadas: 2")
PYEOF

echo ""
echo -e "${GREEN}✅ Backend test environment ready!${NC}"
echo ""
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Password: $DB_PASSWORD"
echo ""
echo "Test users:"
echo "  - Superuser: admin_test / test123"
echo "  - Taller: taller_test / test123"
echo "  - Mecánico 1: mecanico1_test / test123"
echo "  - Mecánico 2: mecanico2_test / test123"
echo "  - Cliente: cliente_test / test123"
echo ""
echo "To start the backend server:"
echo "  cd $BACKEND_DIR"
echo "  source venv/bin/activate"
echo "  export \$(cat .env.test | xargs)"
echo "  python manage.py runserver 0.0.0.0:8000"
