import { Linking, Platform, Share } from 'react-native';
import {
  extraerNueveDigitosDesdeGuardado,
  telefonoMovilChileValido,
} from '@/utils/chilePhone';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import {
  resolverManoObraLineas,
  type CotizacionCanal,
} from '@/services/cotizacionCanalService';

export function nombresTrabajosCotizacion(
  cot: Pick<CotizacionCanal, 'mano_obra_lineas' | 'mano_obra_clp' | 'servicio_nombre' | 'metadata'>,
): string[] {
  return resolverManoObraLineas(cot)
    .filter((lin) => lin.monto_clp > 0 && lin.nombre.trim())
    .map((lin) => lin.nombre.trim());
}

export function mensajeCotizacionParaCliente(opts: {
  clienteNombre?: string | null;
  numeroPublico?: string | null;
  servicio?: string | null;
  totalClp?: number | null;
  url: string;
  actualizada?: boolean;
  trabajos?: string[] | null;
}): string {
  const rawName = (opts.clienteNombre || '').trim();
  const first = rawName.split(/\s+/)[0] || '';
  const genericos = new Set(['', 'cliente', 'contacto', 'hola']);
  const saludo = genericos.has(first.toLowerCase()) ? 'Hola' : `Hola ${first}`;
  const folio = (opts.numeroPublico || '').trim();
  const verbo = opts.actualizada
    ? 'actualizamos tu cotización'
    : 'tenemos lista tu cotización';
  let cabeza = `${saludo}, ${verbo}`;
  if (folio) cabeza += ` ${folio}`;
  cabeza += '.';
  const servicio = (opts.servicio || '').trim();
  const monto = opts.totalClp != null ? formatearMontoCLP(opts.totalClp) : '';
  const detalle = [servicio, monto].filter(Boolean).join(' por ');
  const lineas = [cabeza];
  if (detalle) lineas.push(`${detalle}.`);
  const trabajos = (opts.trabajos || [])
    .map((t) => t.trim())
    .filter((t) => t && t.toLowerCase() !== servicio.toLowerCase());
  if (trabajos.length) {
    lineas.push(`Incluye: ${trabajos.join(', ')}.`);
  }
  lineas.push(`Revísala y acéptala aquí: ${opts.url}`);
  return lineas.join(' ');
}

export function waMeDigitsFromTelefono(telefono?: string | null): string | null {
  const nueve = extraerNueveDigitosDesdeGuardado(telefono);
  if (telefonoMovilChileValido(nueve)) return `56${nueve}`;
  const digits = (telefono || '').replace(/\D/g, '');
  if (digits.length >= 8) return digits;
  return null;
}

export async function abrirWhatsAppCotizacion(opts: {
  telefono?: string | null;
  mensaje: string;
  url: string;
}): Promise<'whatsapp' | 'share' | 'clipboard'> {
  const digits = waMeDigitsFromTelefono(opts.telefono);
  if (digits) {
    const wa = `https://wa.me/${digits}?text=${encodeURIComponent(opts.mensaje)}`;
    try {
      const can = Platform.OS === 'web' ? true : await Linking.canOpenURL(wa);
      if (can) {
        await Linking.openURL(wa);
        return 'whatsapp';
      }
    } catch {
      /* fallback below */
    }
  }
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(opts.mensaje);
    return 'clipboard';
  }
  await Share.share({ message: opts.mensaje, url: opts.url });
  return 'share';
}
