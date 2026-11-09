export type CotizacionBuscable = {
  cliente_nombre?: string | null;
  cliente_display?: string | null;
  cliente_telefono?: string | null;
  numero_publico?: string | null;
  servicio_nombre?: string | null;
  descripcion_problema?: string | null;
  vehiculo_marca?: string | null;
  vehiculo_modelo?: string | null;
  vehiculo_anio?: number | string | null;
  vehiculo_patente?: string | null;
};

function plegar(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function compactar(valor: string): string {
  return valor.replace(/[^a-z0-9]/g, '');
}

/**
 * Cada palabra debe aparecer en algún dato visible.
 * Ignora mayúsculas, tildes y los guiones de la patente.
 */
export function coincideBusquedaCotizacion(
  cotizacion: CotizacionBuscable,
  consulta: string,
): boolean {
  const texto = plegar(consulta).trim().replace(/\s+/g, ' ');
  if (!texto) return true;
  const campos = [
    cotizacion.cliente_nombre,
    cotizacion.cliente_display,
    cotizacion.cliente_telefono,
    cotizacion.numero_publico,
    cotizacion.servicio_nombre,
    cotizacion.descripcion_problema,
    cotizacion.vehiculo_marca,
    cotizacion.vehiculo_modelo,
    cotizacion.vehiculo_anio,
    cotizacion.vehiculo_patente,
    [cotizacion.vehiculo_marca, cotizacion.vehiculo_modelo].filter(Boolean).join(' '),
  ].map((campo) => plegar(campo));
  const unido = campos.join(' ');
  const compacto = compactar(unido);
  const patente = compactar(plegar(cotizacion.vehiculo_patente));
  return texto.split(' ').every((token) => {
    if (!token) return true;
    if (unido.includes(token)) return true;
    const pieza = compactar(token);
    if (!pieza) return false;
    return patente.includes(pieza) || compacto.includes(pieza);
  });
}
