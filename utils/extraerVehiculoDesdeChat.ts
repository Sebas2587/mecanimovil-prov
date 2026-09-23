import { extraerCilindrajeDesdeTexto } from '@/utils/extraerCilindrajeDesdeTexto';
import { extraerPatentesChile } from '@/utils/extraerPatentesChile';

const MARCAS: Array<[string, string]> = [
  ['mercedes-benz', 'Mercedes-Benz'],
  ['mercedes benz', 'Mercedes-Benz'],
  ['great wall', 'Great Wall'],
  ['ssangyong', 'SsangYong'],
  ['volkswagen', 'Volkswagen'],
  ['mitsubishi', 'Mitsubishi'],
  ['chevrolet', 'Chevrolet'],
  ['citroen', 'Citroën'],
  ['peugeot', 'Peugeot'],
  ['renault', 'Renault'],
  ['toyota', 'Toyota'],
  ['nissan', 'Nissan'],
  ['hyundai', 'Hyundai'],
  ['suzuki', 'Suzuki'],
  ['subaru', 'Subaru'],
  ['mazda', 'Mazda'],
  ['honda', 'Honda'],
  ['ford', 'Ford'],
  ['jeep', 'Jeep'],
  ['fiat', 'Fiat'],
  ['chery', 'Chery'],
  ['volvo', 'Volvo'],
  ['dodge', 'Dodge'],
  ['audi', 'Audi'],
  ['bmw', 'BMW'],
  ['kia', 'Kia'],
  ['ram', 'RAM'],
  ['mg', 'MG'],
];

const STOP = new Set([
  'del', 'de', 'mi', 'el', 'la', 'los', 'las', 'un', 'una', 'es', 'con', 'para',
  'auto', 'carro', 'vehiculo', 'patente', 'ano', 'año', 'modelo', 'marca', 'color', 'motor',
]);

export type TraccionChat = '4x4' | '4x2' | '';

export type LineaChat = {
  texto: string;
  propio: boolean;
};

export type VehiculoEnChat = {
  patente: string | null;
  marca: string;
  modelo: string;
  anio: string;
  cilindraje: string;
  traccion: TraccionChat;
};

function sinAcento(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function titulo(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function anioEn(texto: string): string {
  const match = texto.match(/\b(19[89]\d|20[0-2]\d)\b/);
  return match?.[1] || '';
}

function menciona(plano: string, cual: '4x4' | '4x2'): boolean {
  if (cual === '4x4') {
    return /\b4\s*[x×]\s*4\b/.test(plano) || /\b4wd\b/.test(plano) || /doble traccion/.test(plano);
  }
  return /\b4\s*[x×]\s*2\b/.test(plano) || /\b2wd\b/.test(plano) || /traccion simple/.test(plano);
}

/** Si el mensaje nombra las dos, es la pregunta, no la respuesta. */
function traccionExplicita(texto: string): TraccionChat {
  const plano = sinAcento(texto);
  const es4x4 = menciona(plano, '4x4');
  const es4x2 = menciona(plano, '4x2');
  if (es4x4 === es4x2) return '';
  return es4x4 ? '4x4' : '4x2';
}

function esAfirmacion(texto: string): boolean {
  return /^(si+|claro|correcto|exacto|asi es|ese|esa|afirmativo)\b/.test(sinAcento(texto).trim());
}

/**
 * 4x4 o 4x2 dicho por el cliente, o un sí a la pregunta del taller o de la IA
 * cuando esa pregunta nombra una sola opción.
 */
function traccionDesdeLineas(lineas: LineaChat[]): TraccionChat {
  for (let i = lineas.length - 1; i >= 0; i -= 1) {
    const linea = lineas[i];
    if (linea.propio) continue;
    const directa = traccionExplicita(linea.texto);
    if (directa) return directa;
    if (!esAfirmacion(linea.texto) || i === 0) continue;
    const previa = lineas[i - 1];
    if (!previa.propio) continue;
    const preguntada = traccionExplicita(previa.texto);
    if (preguntada) return preguntada;
  }
  return '';
}

function marcaModeloEn(texto: string): { marca: string; modelo: string } {
  const plano = sinAcento(texto);
  for (const [clave, etiqueta] of MARCAS) {
    const needle = sinAcento(clave).replace(/\s+/g, '\\s+');
    const match = plano.match(new RegExp(`(?:^|[^a-z0-9])(${needle})(?![a-z0-9])`));
    if (!match || match.index == null) continue;
    const despues = plano.slice(match.index + match[0].length).trim();
    const token = despues.split(/\s+/)[0]?.replace(/[^a-z0-9]/g, '') || '';
    const modelo = token && !STOP.has(token) && !/^(19|20)\d{2}$/.test(token)
      ? titulo(token)
      : '';
    return { marca: etiqueta, modelo };
  }
  return { marca: '', modelo: '' };
}

/** Patente, datos del auto y tracción mencionados en el chat. */
export function vehiculoDesdeMensajesCliente(lineas: LineaChat[]): VehiculoEnChat {
  const vacio: VehiculoEnChat = {
    patente: null,
    marca: '',
    modelo: '',
    anio: '',
    cilindraje: '',
    traccion: '',
  };
  const delCliente = lineas.filter((linea) => !linea.propio).map((linea) => linea.texto).reverse();
  let patente: string | null = null;
  let marca = '';
  let modelo = '';
  let anio = '';
  let cilindraje = '';

  for (const texto of delCliente) {
    if (!patente) {
      const plates = extraerPatentesChile(texto);
      if (plates.length) patente = plates[plates.length - 1];
    }
    if (!marca) {
      const encontrado = marcaModeloEn(texto);
      marca = encontrado.marca;
      modelo = encontrado.modelo;
    }
    if (!anio) anio = anioEn(texto);
    if (!cilindraje) cilindraje = extraerCilindrajeDesdeTexto(texto);
    if (patente && marca && anio && cilindraje) break;
  }

  const traccion = traccionDesdeLineas(lineas);
  if (!patente && !marca && !anio && !cilindraje && !traccion) return vacio;
  return { patente, marca, modelo, anio, cilindraje, traccion };
}

export function resumenVehiculoChat(vehiculo: VehiculoEnChat): string {
  return [vehiculo.marca, vehiculo.modelo, vehiculo.anio, vehiculo.cilindraje, vehiculo.traccion]
    .filter(Boolean)
    .join(' · ');
}
