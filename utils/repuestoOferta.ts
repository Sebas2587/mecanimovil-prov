/** Calidad del repuesto que configura el proveedor en la oferta. */
export type CalidadRepuesto = 'original' | 'oem' | 'alternativo';

export type RepuestoOfertaConfig = {
  marcaRepuesto: string;
  calidad: CalidadRepuesto | '';
};

export const CALIDAD_REPUESTO_OPTIONS: {
  value: CalidadRepuesto;
  label: string;
  hint: string;
}[] = [
  { value: 'original', label: 'Original', hint: 'Pieza de la marca del vehículo' },
  { value: 'oem', label: 'OEM', hint: 'Fabricante original de equipo, sin logo de marca' },
  { value: 'alternativo', label: 'Alternativo', hint: 'Repuesto compatible de terceros' },
];

export function labelCalidadRepuesto(calidad: string | null | undefined): string {
  return CALIDAD_REPUESTO_OPTIONS.find((o) => o.value === calidad)?.label ?? '';
}

export function repuestoConfigVacio(): RepuestoOfertaConfig {
  return { marcaRepuesto: '', calidad: '' };
}
