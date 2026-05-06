/**
 * Iconografía — App Proveedores (MecaniMóvil)
 *
 * **Una sola familia de iconos en producto:** [Lucide](https://lucide.dev) vía `lucide-react-native`
 * (trazo geométrico mínimo, alineado a la referencia tipo Coinbase: superficies claras, sin mezclar
 * pictogramas de relleno tipo Material con trazo tipo Lucide).
 *
 * - Import preferido: iconos concretos desde `lucide-react-native` (tree-shaking).
 * - Compatibilidad temporal: `InstitutionalIcon` (`@/components/ui/InstitutionalIcon`) mapea nombres
 *   históricos de Material / Ionicons a Lucide; no añadir nuevos usos de `@expo/vector-icons` en UI.
 *
 * @see DESIGN_PROVEEDORES_INSTITUCIONAL.md
 */

/** Grosor de trazo por defecto (listas, metadatos) */
export const ICON_STROKE_WIDTH = 1.75;

/** CTAs, foco, cabeceras */
export const ICON_STROKE_WIDTH_EMPHASIS = 2.25;

/** Escala de tamaño (px) — alinear con densidad de pantalla, no valores sueltos */
export const ICON_SIZE = {
  xs: 14,
  sm: 18,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

export type IconSizeToken = keyof typeof ICON_SIZE;
