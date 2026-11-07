"""Test-only Django entrypoint for the provider fixture suite.

Does not read the backend `.env.test`. Disconnects the AI chunk signals the
same way `run_test_server.py` does, and forces Celery eager so a save cannot
publish to Redis. Production settings stay unchanged.
"""

from __future__ import annotations

import os
import sys

_READY = False


def configure_environment() -> None:
    backend = os.environ.get('BACKEND_DIR', '/tmp/mecanimovil-backend')
    if backend not in sys.path:
        sys.path.insert(0, backend)
    for key in ('REDIS_URL', 'CELERY_BROKER_URL', 'CELERY_RESULT_BACKEND'):
        os.environ.pop(key, None)
    os.environ['DJANGO_SETTINGS_MODULE'] = 'mecanimovilapp.settings'
    os.environ['DEBUG'] = 'True'
    os.environ['SECURE_SSL_REDIRECT'] = 'False'
    os.environ['ASISTENTE_COTIZACION_IA_ENABLED'] = 'False'
    os.environ['BUSQUEDA_WEB_REPUESTOS_ENABLED'] = 'False'
    os.environ['OMNICHANNEL_ENABLED'] = 'False'
    os.environ['WHATSAPP_TEMPLATES_ENABLED'] = 'False'
    os.environ.setdefault('GDAL_LIBRARY_PATH', '/usr/lib/x86_64-linux-gnu/libgdal.so')
    os.environ.setdefault('SECRET_KEY', 'test-secret-key-for-ci-only-never-use-in-production')
    if not os.environ.get('DATABASE_URL'):
        raise SystemExit('DATABASE_URL is required. This runner does not read .env.test.')


def prepare_isolated_runtime() -> None:
    global _READY
    if _READY:
        return
    configure_environment()
    from mecanimovilapp import settings

    settings.DEBUG = True
    settings.SECURE_SSL_REDIRECT = False
    settings.CACHES = {
        'default': {'BACKEND': 'django.core.cache.backends.dummy.DummyCache'},
    }
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
    settings.CELERY_BROKER_URL = 'memory://'
    settings.CELERY_RESULT_BACKEND = 'cache+memory://'

    import django

    django.setup()

    from django.db.models.signals import post_save
    from mecanimovilapp.apps.agente_ia import signals as agente_signals
    from mecanimovilapp.apps.agente_ia.models import TallerAgenteConfig
    from mecanimovilapp.apps.ordenes.models import SolicitudServicio
    from mecanimovilapp.apps.servicios.models import OfertaServicio

    receivers = (
        (agente_signals.sync_oferta_servicio_chunk, OfertaServicio),
        (agente_signals.sync_solicitud_historico_chunk, SolicitudServicio),
        (agente_signals.sync_instrucciones_taller, TallerAgenteConfig),
    )
    for receiver, sender in receivers:
        if not post_save.disconnect(receiver, sender=sender):
            raise SystemExit(f'Could not disconnect {receiver.__name__}.')
    _freeze_next_service_morning()
    _READY = True


def _freeze_next_service_morning() -> None:
    """Pin the isolated clock to the next Santiago morning.

    The fixture date stays in the future against the wall clock, and every
    chip after 07:00 is still ahead of that clock. The service-day gate then
    matches the date the calendar actually saves. Production settings are
    untouched.
    """
    from datetime import datetime, timedelta
    from zoneinfo import ZoneInfo

    from django.utils import timezone

    zone = ZoneInfo('America/Santiago')
    real_now = datetime.now(zone)
    morning = (real_now + timedelta(days=1)).replace(hour=7, minute=0, second=0, microsecond=0)

    def frozen_now():
        return morning

    timezone.now = frozen_now


def main() -> None:
    prepare_isolated_runtime()
    from django.core.management import execute_from_command_line

    argv = ['manage.py', *sys.argv[1:]] if len(sys.argv) > 1 else ['manage.py', 'migrate', '--noinput']
    execute_from_command_line(argv)


if __name__ == '__main__':
    main()
