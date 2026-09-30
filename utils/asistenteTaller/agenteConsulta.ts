import type { EventoAgendaUnificado } from '@/services/agendaProveedorService';
import type { PipelineComercialItem } from '@/services/pipelineComercialService';
import type { ProveedorKpisResumen } from '@/services/kpisProveedorService';
import { isSameDay, parseFechaLocal } from '@/utils/fechaLocal';
import { decisionesDePipeline } from '@/utils/asistenteTaller/verboLead';

export type FilaConsulta = {
  id: string;
  titulo: string;
  detalle: string;
  meta: string;
};

export type ConfirmacionConsulta = {
  etiqueta: string;
  tipo: 'accion' | 'whatsapp';
};

export type EnlaceConsulta = {
  url: string;
  cotizacion_id: number;
  busqueda_pendiente?: boolean;
  titulo?: string;
  descripcion?: string;
};

export type ResultadoConsulta = {
  titulo: string;
  resumen: string;
  filas: FilaConsulta[];
  confirmacion?: ConfirmacionConsulta | null;
  enlace?: EnlaceConsulta | null;
};

export type AccionConsulta =
  | { tipo: 'agendar'; ids: string[] }
  | { tipo: 'mensaje'; id: string; texto: string };

export type PlanConsulta = {
  resultado: ResultadoConsulta;
  accion: AccionConsulta | null;
  pideRendimiento: boolean;
  memoriaIds: string[];
};

const CERRADOS = new Set(['completado', 'rechazado_perdido']);

function plano(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function claveDe(item: PipelineComercialItem): string {
  return `${item.tipo_entidad}:${item.entidad_id}`;
}

function abiertos(items: PipelineComercialItem[]): PipelineComercialItem[] {
  const vistos = new Set<string>();
  const out: PipelineComercialItem[] = [];
  for (const item of items) {
    if (CERRADOS.has(item.estado_normalizado)) continue;
    const clave = claveDe(item);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    out.push(item);
  }
  return out;
}

function filaDe(
  item: PipelineComercialItem,
  estados: Map<string, string>,
): FilaConsulta {
  const titulo = (item.cliente_nombre || item.cliente_telefono || 'Cliente').trim();
  const detalle = [item.vehiculo_resumen, item.servicio_resumen].filter(Boolean).join(' · ');
  return {
    id: claveDe(item),
    titulo,
    detalle,
    meta: estados.get(item.entidad_id) || 'Abierto',
  };
}

function porTexto(items: PipelineComercialItem[], texto: string): PipelineComercialItem[] {
  const p = plano(texto).replace(/[^a-z0-9\s]/g, ' ');
  const tokens = p.split(/\s+/).filter((token) => token.length > 3);
  if (tokens.length === 0) return [];
  return items.filter((item) => {
    const bolsa = plano([
      item.cliente_nombre,
      item.cliente_telefono,
      item.vehiculo_resumen,
      item.servicio_resumen,
      item.numero_publico,
      item.estado_normalizado,
    ].filter(Boolean).join(' '));
    return tokens.some((token) => bolsa.includes(token));
  });
}

function mencionados(
  texto: string,
  items: PipelineComercialItem[],
  memoriaIds: string[],
): PipelineComercialItem[] {
  const p = plano(texto);
  const porId = new Map(items.map((item) => [claveDe(item), item]));
  if (/\b(esas|estas|los|las|pendientes|anteriores)\b/.test(p) && memoriaIds.length > 0) {
    return memoriaIds.map((id) => porId.get(id)).filter((item): item is PipelineComercialItem => Boolean(item));
  }
  const primera = /\b(la primera|el primero|primera)\b/.test(p);
  const segunda = /\b(la segunda|el segundo|segunda)\b/.test(p);
  if ((primera || segunda) && memoriaIds.length > 0) {
    const id = memoriaIds[primera ? 0 : 1];
    const item = id ? porId.get(id) : undefined;
    return item ? [item] : [];
  }
  return porTexto(items, texto);
}

function textoMensaje(original: string): string {
  const match = original.match(
    /(?:diciendo|que diga|de que|avisale que|avisa que|mensaje de|escribele que|mandale que)\s+([\s\S]+)/i,
  );
  const cuerpo = (match?.[1] || '').trim();
  return cuerpo || original.trim();
}

function eventosDeHoy(eventos: EventoAgendaUnificado[], hoy = new Date()): EventoAgendaUnificado[] {
  return eventos
    .filter((evento) => {
      const fecha = parseFechaLocal(evento.fecha_servicio);
      return fecha ? isSameDay(fecha, hoy) : false;
    })
    .sort((a, b) => (a.hora_servicio || '').localeCompare(b.hora_servicio || ''));
}

export function planificarConsulta(input: {
  texto: string;
  items: PipelineComercialItem[];
  eventos: EventoAgendaUnificado[];
  memoriaIds: string[];
}): PlanConsulta {
  const texto = input.texto.trim();
  const p = plano(texto);
  const estados = new Map(
    decisionesDePipeline(input.items).map((lead) => [lead.id, lead.estado]),
  );
  const vivos = abiertos(input.items);
  const pideRendimiento = /rendimient|como voy|como va|kpi|score|calificacion del taller/.test(p);
    const pideAgenda = /\bque tengo\b|\bmi dia\b|\bcitas\b|\bcalendario\b|\bagendamient/.test(p)
      || (/\bagenda\b/.test(p) && !/\bagendar\b/.test(p));
  const pidePendientes = /pendient|por hacer|abiert|sin cerrar|cuant|ordenes|trabajo abierto/.test(p);
  const pideAgendar = /\bagendar\b|\bprograma\b|\bponle hora\b|\bponer hora\b/.test(p);
  const pideMensaje = /envia|enviá|manda|escrib|whatsapp|mensaje|avisale|avisa|escribile/.test(p);

  if (pideAgendar || pideMensaje) {
    const elegidos = mencionados(texto, input.items, input.memoriaIds);
    const base = elegidos.length > 0 ? elegidos : mencionados('esas', input.items, input.memoriaIds);
    if (base.length === 0) {
      return {
        pideRendimiento: false,
        accion: null,
        memoriaIds: input.memoriaIds,
        resultado: {
          titulo: 'Falta el caso',
          resumen: 'Dime a quién, o pregunta primero las órdenes y después pide la acción sobre esas.',
          filas: [],
        },
      };
    }
    if (pideMensaje) {
      if (base.length > 1) {
        const filas = base.map((item) => filaDe(item, estados));
        return {
          pideRendimiento: false,
          accion: null,
          memoriaIds: filas.map((fila) => fila.id),
          resultado: {
            titulo: '¿A cuál cliente?',
            resumen: 'Hay más de uno. Nombra a la persona o di “el primero”.',
            filas,
          },
        };
      }
      const uno = base[0];
      return {
        pideRendimiento: false,
        accion: null,
        memoriaIds: [claveDe(uno)],
        resultado: {
          titulo: `Mensaje a ${uno.cliente_nombre || 'el cliente'}`,
          resumen: uno.cliente_telefono
            ? `${textoMensaje(texto)}\nTeléfono: ${uno.cliente_telefono}`
            : 'Ese caso no tiene teléfono. El texto queda aquí para copiarlo.',
          filas: [filaDe(uno, estados)],
        },
      };
    }
    const agendables = base.filter((item) => (
      item.horario_por_confirmar || !item.fecha_agendada
    ));
    const lista = agendables.length > 0 ? agendables : base;
    return {
      pideRendimiento: false,
      accion: null,
      memoriaIds: lista.map((item) => claveDe(item)),
      resultado: {
        titulo: lista.length === 1 ? 'Agendar' : `${lista.length} para agendar`,
        resumen: 'El cupo se confirma en este hilo. No pude leer la agenda del taller ahora.',
        filas: lista.map((item) => filaDe(item, estados)),
      },
    };
  }

  if (pideRendimiento) {
    return {
      pideRendimiento: true,
      accion: null,
      memoriaIds: input.memoriaIds,
      resultado: {
        titulo: 'Rendimiento del taller',
        resumen: 'Estoy mirando los últimos 30 días.',
        filas: [],
      },
    };
  }

  if (pideAgenda) {
    const delDia = eventosDeHoy(input.eventos);
    return {
      pideRendimiento: false,
      accion: null,
      memoriaIds: input.memoriaIds,
      resultado: {
        titulo: 'Hoy en el taller',
        resumen: delDia.length === 0
          ? 'Hoy no hay autos con hora.'
          : delDia.length === 1 ? 'Hay 1 auto con hora.' : `Hay ${delDia.length} autos con hora.`,
        filas: delDia.map((evento) => {
          const auto = [evento.vehiculo_marca, evento.vehiculo_modelo, evento.vehiculo_patente]
            .filter(Boolean)
            .join(' ');
          return {
            id: `${evento.origen}-${evento.id}`,
            titulo: (evento.cliente_nombre || 'Cliente').trim(),
            detalle: [evento.hora_servicio?.slice(0, 5), evento.servicio_nombre || evento.etiqueta]
              .filter(Boolean)
              .join(' · '),
            meta: auto || 'Auto no anotado en la cita',
          };
        }),
      },
    };
  }

  if (pidePendientes) {
    const filas = vivos.map((item) => filaDe(item, estados));
    return {
      pideRendimiento: false,
      accion: null,
      memoriaIds: filas.map((fila) => fila.id),
      resultado: {
        titulo: 'Órdenes pendientes',
        resumen: filas.length === 0
          ? 'No hay órdenes abiertas.'
          : filas.length === 1
            ? 'Hay 1 orden abierta.'
            : `Hay ${filas.length} órdenes abiertas.`,
        filas,
      },
    };
  }

  const hallados = porTexto(vivos, texto);
  if (hallados.length > 0) {
    const filas = hallados.map((item) => filaDe(item, estados));
    return {
      pideRendimiento: false,
      accion: null,
      memoriaIds: filas.map((fila) => fila.id),
      resultado: {
        titulo: 'Esto coincide',
        resumen: hallados.length === 1
          ? 'Encontré un caso con lo que escribiste.'
          : `Encontré ${hallados.length} casos.`,
        filas,
      },
    };
  }

  return {
    pideRendimiento: false,
    accion: null,
    memoriaIds: input.memoriaIds,
    resultado: {
      titulo: 'No encontré eso',
      resumen: vivos.length === 0
        ? 'El taller no tiene casos abiertos ahora.'
        : `No coincide con un cliente, un auto ni un pedido. Hay ${vivos.length} órdenes abiertas si quieres verlas.`,
      filas: [],
    },
  };
}

const MENORES = new Set(['de', 'del', 'la', 'el', 'y', 'e', 'a', 'en']);

function tituloFrase(texto: string): string {
  return texto.split(/\s+/).filter(Boolean).map((parte, index) => {
    if (index > 0 && MENORES.has(parte)) return parte;
    return parte.charAt(0).toUpperCase() + parte.slice(1);
  }).join(' ');
}

export function frasesEsperaCotizacion(texto: string): string[] | null {
  const p = plano(texto);
  if (/se cotiza|cotiza mas|mas cotiz|cuantas cotiz/.test(p)) return null;
  if (/servicio del taller|dar de alta|da de alta|en el catalogo|como servicio/.test(p)
    && !/\b(cotizacion|presupuesto)\b/.test(p)) {
    return null;
  }
  if (!/\b(cotizacion|cotizar|cotizale|cotizame|cotiza|presupuesto)\b/.test(p)) return null;
  const patente = texto.toUpperCase().match(/\b([A-Z]{4}\s?-?\s?\d{2}|[A-Z]{2}\s?-?\s?\d{4})\b/);
  const servicio = p.match(
    /\b((?:cambio|reparacion|mantencion|revision|alineacion|balanceo|diagnostico|instalacion)\s+de\s+[a-z0-9 ]{3,40})/,
  );
  const frases: string[] = [];
  if (patente) {
    frases.push(`Buscando la patente ${patente[1].replace(/[\s-]/g, '')}…`);
  }
  const nombre = servicio
    ? tituloFrase(servicio[1].split(/\b(?:para|patente|domicilio)\b/)[0].trim())
    : 'la cotización';
  const candidatos = [...p.matchAll(/\bpara\s+([a-zñ]+(?:\s+[a-zñ]+){0,2})(?:\s+((?:19|20)\d{2}))?/g)];
  const auto = candidatos.find((item) => !['el', 'la', 'los', 'un', 'una', 'este'].includes(item[1].split(' ')[0]));
  const vehiculo = auto && auto[1].split(' ').length > 1
    ? `${tituloFrase(auto[1])}${auto[2] ? ` ${auto[2]}` : ''}`
    : '';
  frases.push(vehiculo ? `Armando ${nombre} para ${vehiculo}…` : `Armando ${nombre}…`);
  if (!/\bsin repuestos\b/.test(p)) frases.push('Buscando repuestos…');
  return frases;
}

export function fraseHaciendo(texto: string): string {
  const espera = frasesEsperaCotizacion(texto);
  if (espera?.length) return espera[0];
  const p = plano(texto);
  if (/\bagendar\b|\bprograma\b|\bponle hora\b|\bponer hora\b/.test(p)) {
    return 'Buscando a quién hay que ponerle hora…';
  }
  if (/envia|enviá|manda|escrib|whatsapp|mensaje|avisale|avisa|escribile/.test(p)) {
    return 'Preparando el mensaje al cliente…';
  }
  if (/rendimient|como voy|como va|kpi|score|calificacion del taller/.test(p)) {
    return 'Leyendo el rendimiento del taller…';
  }
  if (/\bque tengo\b|\bmi dia\b|\bcitas\b|\bcalendario\b|\bagendamient/.test(p) || (/\bagenda\b/.test(p) && !/\bagendar\b/.test(p))) {
    return 'Revisando los autos con hora…';
  }
  if (/pendient|por hacer|abiert|sin cerrar|cuant|ordenes|trabajo abierto/.test(p)) {
    return 'Contando las órdenes pendientes…';
  }
  return 'Buscando en los casos del taller…';
}

export function filasRendimiento(kpis: ProveedorKpisResumen): FilaConsulta[] {
  const nota = kpis.calificacion_cliente_promedio;
  return [
    {
      id: 'score',
      titulo: 'Rendimiento',
      detalle: `${kpis.score_rendimiento}% en ${kpis.ventana_dias} días`,
      meta: kpis.suscripcion_mensual_activa ? 'Suscripción activa' : 'Sin suscripción mensual',
    },
    {
      id: 'ordenes',
      titulo: 'Trabajo cerrado',
      detalle: `${kpis.servicios_terminados_en_periodo} servicios terminados`,
      meta: `${kpis.ordenes_mercado_completadas} órdenes de la app`,
    },
    {
      id: 'clientes',
      titulo: 'Clientes',
      detalle: nota == null ? 'Sin reseñas en el periodo' : `Nota ${nota.toFixed(1)}`,
      meta: `${kpis.resenas_muestra} reseñas en el periodo`,
    },
  ];
}
