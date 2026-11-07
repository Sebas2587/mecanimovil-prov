"""Idempotent isolated fixtures for the provider E2E suite.

Uses the models that actually exist. Writes e2e/fixture-manifest.json with the
ids the specs must read. Does not print credentials.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import time
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, os.environ.get('BACKEND_DIR', '/tmp/mecanimovil-backend'))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from isolated_backend import prepare_isolated_runtime  # noqa: E402

prepare_isolated_runtime()

from django.apps import apps  # noqa: E402
from django.contrib.auth import get_user_model  # noqa: E402
from django.utils import timezone  # noqa: E402

User = get_user_model()
Taller = apps.get_model('usuarios', 'Taller')
Miembro = apps.get_model('usuarios', 'MiembroTaller')
Horario = apps.get_model('usuarios', 'HorarioProveedor')
Cliente = apps.get_model('usuarios', 'Cliente')
Marca = apps.get_model('vehiculos', 'Marca')
Modelo = apps.get_model('vehiculos', 'Modelo')
Vehiculo = apps.get_model('vehiculos', 'Vehiculo')
Servicio = apps.get_model('servicios', 'Servicio')
Oferta = apps.get_model('servicios', 'OfertaServicio')
Orden = apps.get_model('ordenes', 'SolicitudServicio')
Catalogo = apps.get_model('checklists', 'ChecklistItemCatalog')
Template = apps.get_model('checklists', 'ChecklistTemplate')
ItemTemplate = apps.get_model('checklists', 'ChecklistItemTemplate')
Instance = apps.get_model('checklists', 'ChecklistInstance')
Respuesta = apps.get_model('checklists', 'ChecklistItemResponse')

PASSWORD = os.environ.get('FIXTURE_PASSWORD', 'test123')
MARKER = 'fixture-3624'
SERVICIO_NOMBRE = 'Inspección Test Frontend'
SELECT_LABEL = 'Revisar nivel de aceite'


def user(username: str, email: str):
    row, created = User.objects.get_or_create(
        username=username,
        defaults={'email': email, 'is_active': True},
    )
    if created or not row.check_password(PASSWORD):
        row.email = email
        row.is_active = True
        row.set_password(PASSWORD)
        row.save()
    return row


def miembro(usuario, taller, nombre: str):
    row, _ = Miembro.objects.get_or_create(
        usuario=usuario,
        defaults={
            'taller': taller,
            'nombre': nombre,
            'rol': 'mecanico',
            'activo': True,
            'modalidad_tecnico': 'en_taller',
        },
    )
    dirty = False
    for field, value in (
        ('taller', taller),
        ('nombre', nombre),
        ('rol', 'mecanico'),
        ('activo', True),
        ('modalidad_tecnico', 'en_taller'),
    ):
        if getattr(row, field) != value:
            setattr(row, field, value)
            dirty = True
    if dirty:
        row.save()
    return row


def orden(marker: str, **fields):
    row = Orden.objects.filter(notas_proveedor=marker).first()
    if row is None:
        row = Orden(notas_proveedor=marker, **fields)
        row.save()
        return row
    for key, value in fields.items():
        setattr(row, key, value)
    row.notas_proveedor = marker
    row.save()
    return row


def main() -> None:
    owner = user('taller_test', 'taller@test.com')
    taller, _ = Taller.objects.get_or_create(
        usuario=owner,
        defaults={
            'nombre': 'Taller Test',
            'telefono': '+56912345678',
            'estado_verificacion': 'aprobado',
            'verificado': True,
            'onboarding_completado': True,
            'activo': True,
            'modalidad_atencion': 'ambas',
            'tipo_cobertura_marca': 'multimarca',
        },
    )
    taller.estado_verificacion = 'aprobado'
    taller.verificado = True
    taller.activo = True
    taller.save()
    mandante, _ = Miembro.objects.get_or_create(
        taller=taller,
        rol='mandante',
        defaults={
            'usuario': owner,
            'nombre': 'Dueño Taller Test',
            'activo': True,
            'modalidad_tecnico': 'en_taller',
        },
    )
    if mandante.usuario_id != owner.id or not mandante.activo:
        mandante.usuario = owner
        mandante.activo = True
        mandante.save(update_fields=['usuario', 'activo'])

    for dia in range(7):
        hours = Horario.objects.filter(
            taller=taller,
            dia_semana=dia,
            miembro_taller__isnull=True,
            mecanico__isnull=True,
        ).first()
        if hours is None:
            Horario.objects.create(
                taller=taller,
                dia_semana=dia,
                activo=True,
                hora_inicio=time(8, 0),
                hora_fin=time(18, 0),
                duracion_slot=60,
                tiempo_descanso=0,
            )
        elif not hours.activo:
            hours.activo = True
            hours.save(update_fields=['activo'])
    schedule_date = timezone.localdate()

    checklist_user = user('mechanic_test', 'mechanic_test@example.com')
    visita_user = user('mecanico_visita_3624', 'mecanico.visita.3624@test.com')
    ocupado_user = user('mecanico_ocupado_3624', 'mecanico.ocupado.3624@test.com')
    mechanic_checklist = miembro(checklist_user, taller, 'Técnico Checklist 3624')
    mechanic_visita = miembro(visita_user, taller, 'Técnico Visita 3624')
    mechanic_ocupado = miembro(ocupado_user, taller, 'Técnico Ocupado 3624')

    cliente_user = user('cliente_fixture_3624', 'cliente.fixture.3624@test.com')
    cliente, _ = Cliente.objects.get_or_create(
        usuario=cliente_user,
        defaults={
            'nombre': 'Cliente',
            'apellido': 'Fixture',
            'email': 'cliente.fixture.3624@test.com',
            'telefono': '+56900003624',
        },
    )
    marca, _ = Marca.objects.get_or_create(nombre='FixtureMarca3624')
    modelo, _ = Modelo.objects.get_or_create(nombre='FixtureModelo3624', marca=marca)
    vehiculo, _ = Vehiculo.objects.get_or_create(
        patente='FIX3624',
        defaults={
            'cliente': cliente,
            'marca': marca,
            'modelo': modelo,
            'year': 2018,
            'tipo_motor': 'Gasolina',
            'kilometraje': 1000,
        },
    )

    servicio, _ = Servicio.objects.get_or_create(
        nombre=SERVICIO_NOMBRE,
        defaults={'descripcion': 'Servicio de la suite aislada'},
    )
    oferta = Oferta.objects.filter(taller=taller, servicio=servicio, disponible=True).first()
    if oferta is None:
        oferta = Oferta.objects.create(
            tipo_proveedor='taller',
            taller=taller,
            servicio=servicio,
            disponible=True,
            tipo_servicio='sin_repuestos',
            costo_mano_de_obra_sin_iva=Decimal('15000.00'),
            duracion_estimada=time(1, 0),
        )
    elif not oferta.disponible:
        oferta.disponible = True
        oferta.save(update_fields=['disponible'])

    Template.objects.filter(nombre='Checklist Fixture 3624', servicio=servicio).update(activo=False)
    template = (
        Template.objects.filter(servicio=servicio, activo=True)
        .order_by('fecha_creacion')
        .first()
    )
    item = None
    if template is not None:
        item = (
            ItemTemplate.objects.filter(
                checklist_template=template,
                catalog_item__nombre=SELECT_LABEL,
            )
            .order_by('orden_visual')
            .first()
        )
    if template is None or item is None:
        catalogo, _ = Catalogo.objects.get_or_create(
            nombre=SELECT_LABEL,
            tipo_pregunta='SELECT',
            defaults={
                'categoria': 'FLUIDOS',
                'pregunta_texto': '',
                'opciones_seleccion': ['bueno', 'bajo', 'sucio'],
                'es_obligatorio_por_defecto': True,
                'activo': True,
            },
        )
        template, _ = Template.objects.get_or_create(
            nombre='Checklist Fixture 3624',
            servicio=servicio,
            defaults={'activo': True, 'version': '1'},
        )
        template.activo = True
        template.save(update_fields=['activo'])
        item, _ = ItemTemplate.objects.get_or_create(
            checklist_template=template,
            catalog_item=catalogo,
            defaults={'orden_visual': 1, 'es_obligatorio': True},
        )

    hoy = timezone.localdate()
    comun = {
        'cliente': cliente,
        'vehiculo': vehiculo,
        'tipo_servicio': 'taller',
        'taller': taller,
        'fecha_servicio': hoy,
        'metodo_pago': 'efectivo',
        'total': Decimal('25000.00'),
    }
    order_checklist = orden(
        f'{MARKER}-checklist',
        hora_servicio=time(11, 0),
        estado='servicio_iniciado',
        mecanico_asignado=mechanic_checklist,
        **comun,
    )
    instance, _ = Instance.objects.get_or_create(
        orden=order_checklist,
        defaults={
            'checklist_template': template,
            'estado': 'EN_PROGRESO',
            'progreso_porcentaje': 25,
            'fecha_inicio': timezone.now(),
        },
    )
    instance.estado = 'EN_PROGRESO'
    instance.checklist_template = template
    instance.save(update_fields=['estado', 'checklist_template'])
    Respuesta.objects.get_or_create(
        checklist_instance=instance,
        item_template=item,
        defaults={
            'respuesta_seleccion': 'bueno',
            'completado': True,
        },
    )

    order_busy = orden(
        f'{MARKER}-busy',
        hora_servicio=time(7, 0),
        estado='aceptada_por_proveedor',
        mecanico_asignado=mechanic_ocupado,
        **comun,
    )
    order_open = orden(
        f'{MARKER}-open',
        hora_servicio=time(7, 20),
        estado='aceptada_por_proveedor',
        mecanico_asignado=None,
        **comun,
    )

    manifest = {
        'servicio_nombre': SERVICIO_NOMBRE,
        'select_label': SELECT_LABEL,
        'schedule_date': schedule_date.isoformat(),
        'oferta_id': oferta.id,
        'owner': {'username': owner.username, 'email': owner.email},
        'mechanic_checklist': {
            'username': checklist_user.username,
            'email': checklist_user.email,
            'miembro_id': mechanic_checklist.id,
            'nombre': mechanic_checklist.nombre,
        },
        'mechanic_visita': {
            'username': visita_user.username,
            'email': visita_user.email,
            'miembro_id': mechanic_visita.id,
            'nombre': mechanic_visita.nombre,
        },
        'mechanic_ocupado': {
            'username': ocupado_user.username,
            'email': ocupado_user.email,
            'miembro_id': mechanic_ocupado.id,
            'nombre': mechanic_ocupado.nombre,
        },
        'order_checklist': {
            'id': order_checklist.id,
            'instance_id': instance.id,
            'select_item_template_id': item.id,
        },
        'order_open': {'id': order_open.id},
        'order_busy': {'id': order_busy.id},
    }
    target = Path(os.environ['FIXTURE_MANIFEST'])
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(
        'manifest',
        target,
        'checklist_order',
        order_checklist.id,
        'open_order',
        order_open.id,
        'oferta',
        oferta.id,
    )


if __name__ == '__main__':
    main()
