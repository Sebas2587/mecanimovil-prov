import type { LeadDecision, VerboId } from '@/utils/asistenteTaller/verboLead';

export type OrdenAsistente =
  | { tipo: 'abrir_dia'; fecha: Date; mecanico?: string }
  | { tipo: 'verbo'; leadId: string; verbo: VerboId }
  | { tipo: 'preguntar'; leadIds: string[] }
  | { tipo: 'decir'; texto: string };

function plano(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const;

function inicioDeDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function proximoDiaSemana(objetivo: number, desde: Date): Date {
  const base = inicioDeDia(desde);
  const delta = (objetivo - base.getDay() + 7) % 7;
  const next = new Date(base);
  next.setDate(base.getDate() + (delta === 0 ? 0 : delta));
  return next;
}

export function fechaNombrada(texto: string, ahora = new Date()): Date | null {
  const p = plano(texto);
  if (/\bhoy\b/.test(p)) return inicioDeDia(ahora);
  if (/\bpasado manana\b/.test(p)) {
    const d = inicioDeDia(ahora);
    d.setDate(d.getDate() + 2);
    return d;
  }
  if (/\bmanana\b/.test(p)) {
    const d = inicioDeDia(ahora);
    d.setDate(d.getDate() + 1);
    return d;
  }
  for (let i = 0; i < DIAS.length; i += 1) {
    if (p.includes(DIAS[i])) return proximoDiaSemana(i, ahora);
  }
  return null;
}

function esConsultaDia(texto: string): boolean {
  const p = plano(texto);
  if (/\bagendar\b/.test(p)) return false;
  return /\bque tengo\b/.test(p)
    || /\bmi dia\b/.test(p)
    || /\bcalendario\b/.test(p)
    || /\bmostrar el dia\b/.test(p)
    || /\bmuestrame el dia\b/.test(p)
    || /\bagenda\b/.test(p);
}

function verboNombrado(texto: string): VerboId | null {
  const p = plano(texto);
  if (/agend|ponle hora|confirmar hora|la hora/.test(p)) return 'agendar';
  if (/dijo que si|acepto|marcar aceptada|dale con esa/.test(p)) return 'marcar_aceptada';
  if (/envia|mandala|compart/.test(p)) return 'enviar';
  if (/cotiza/.test(p)) return 'cotizar';
  if (/revisa precio|precios/.test(p)) return 'revisar_precios';
  if (/contest|escribile|whatsapp/.test(p)) return 'contestar';
  if (/empieza|lleg[oó] el|iniciar/.test(p)) return 'empezar';
  if (/confirma la orden|confirmar/.test(p)) return 'confirmar';
  return null;
}

function candidatos(texto: string, leads: LeadDecision[]): LeadDecision[] {
  const p = plano(texto);
  const patente = p.replace(/[^a-z0-9]/g, '');
  const porPatente = leads.filter((lead) => {
    const compacta = plano(lead.auto).replace(/[^a-z0-9]/g, '');
    return compacta.length >= 4 && patente.includes(compacta);
  });
  if (porPatente.length) return porPatente;

  const folio = p.match(/mm-?\d{3,}/);
  if (folio) {
    const needle = folio[0].replace('-', '');
    const porFolio = leads.filter((lead) => plano(lead.folio).replace('-', '').includes(needle));
    if (porFolio.length) return porFolio;
  }

  return leads.filter((lead) => {
    const nombre = plano(lead.quien).split(/\s+/)[0];
    return nombre.length > 2 && p.includes(nombre);
  });
}

export function resolverOrden(
  texto: string,
  leads: LeadDecision[],
  anclaId: string | null,
  ahora = new Date(),
): OrdenAsistente {
  const limpio = texto.trim();
  if (!limpio) return { tipo: 'decir', texto: 'Escribe qué hay que hacer.' };

  const fecha = fechaNombrada(limpio, ahora);
  if (esConsultaDia(limpio)) {
    const mec = limpio.match(/agenda de ([a-záéíóúñ]+)/i);
    return {
      tipo: 'abrir_dia',
      fecha: fecha ?? inicioDeDia(ahora),
      mecanico: mec?.[1],
    };
  }

  const verbo = verboNombrado(limpio);
  const ancla = anclaId ? leads.find((lead) => lead.id === anclaId) : undefined;

  if (ancla && !verbo) {
    return { tipo: 'verbo', leadId: ancla.id, verbo: ancla.verbo };
  }

  if (ancla && verbo) {
    return { tipo: 'verbo', leadId: ancla.id, verbo };
  }

  const matches = candidatos(limpio, leads);
  if (matches.length > 1) {
    return { tipo: 'preguntar', leadIds: matches.slice(0, 2).map((lead) => lead.id) };
  }

  const unico = matches[0];
  if (unico) {
    return { tipo: 'verbo', leadId: unico.id, verbo: verbo ?? unico.verbo };
  }

  if (verbo) {
    const delVerbo = leads.filter((lead) => lead.verbo === verbo);
    if (delVerbo.length === 1) return { tipo: 'verbo', leadId: delVerbo[0].id, verbo };
    if (delVerbo.length > 1) {
      return { tipo: 'preguntar', leadIds: delVerbo.slice(0, 2).map((lead) => lead.id) };
    }
  }

  if (fecha) return { tipo: 'abrir_dia', fecha };

  return {
    tipo: 'decir',
    texto: 'Elige un cliente de la fila, o dime el nombre o la patente.',
  };
}
