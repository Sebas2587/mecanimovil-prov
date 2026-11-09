import { StyleSheet } from 'react-native';
import { BORDERS, COLORS, SPACING, TYPOGRAPHY, withOpacity } from '@/app/design-system/tokens';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;

/**
 * Piso de la columna de precio unitario.
 * Cantidad (72) + subtotal (104) + dos separaciones (12) + este piso no caben
 * en el ancho útil de un viewport de 320 px, así que el subtotal baja de línea
 * y el monto queda visible. A ~390 px las tres columnas siguen juntas.
 */
export const ANCHO_MIN_PRECIO_UNITARIO = 112;

/** Estilos de las partes extraídas del editor. Mismos valores que el editor. */
export const estilosPartes = StyleSheet.create({
cantidadAlign: {
    textAlign: 'center',
  },
colLabel: {
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
  },
colLabelRight: {
    textAlign: 'right',
    width: '100%',
  },
deleteBtn: {
    padding: SPACING.fixed.xs,
    flexShrink: 0,
    marginTop: SPACING.fixed.lg,
  },
descuentoLabel: {
    flex: 1,
    paddingRight: SPACING.fixed.sm,
  },
emptyRepuestos: {
    gap: SPACING.fixed.sm,
    alignItems: 'flex-start',
  },
accionesFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
estadoPunto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: I.ink,
  },
estadoPuntoAlta: {
    backgroundColor: I.semanticUp,
  },
estadoPuntoBaja: {
    backgroundColor: I.semanticDown,
  },
estadoQuieto: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
estadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
  },
gridColCant: {
    width: 72,
    flexShrink: 0,
  },
gridColPrecio: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: ANCHO_MIN_PRECIO_UNITARIO,
    minWidth: ANCHO_MIN_PRECIO_UNITARIO,
    maxWidth: '100%',
    gap: SPACING.fixed.xxs,
  },
gridColSubtotal: {
    width: 104,
    flexShrink: 0,
    alignItems: 'flex-end',
    gap: SPACING.fixed.xxs,
  },
headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
headerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, alignItems: 'center' },
headerTagsCol: { flex: 1, minWidth: 0, gap: SPACING.xs },
headerText: { flex: 1, minWidth: 0, gap: 2 },
metaTexto: { flexShrink: 1, minWidth: 0 },
motivoSeleccionRow: {
    marginTop: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.xs,
    paddingHorizontal: SPACING.fixed.sm,
    backgroundColor: withOpacity(I.ink, 0.05),
    borderRadius: BORDERS.radius.sm,
  },
motivoSeleccionTexto: {
    fontSize: 13,
    lineHeight: 18,
  },
nombreField: { flex: 1, minWidth: 0, gap: SPACING.fixed.xs },
precioMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.xs,
  },
precioMetaTexto: { flex: 1, minWidth: 0 },
repuestoCard: {
    gap: SPACING.fixed.sm,
  },
repuestoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    width: '100%',
    gap: SPACING.fixed.sm,
  },
repuestoTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.xs,
  },
repuestosHint: { marginTop: -SPACING.fixed.xs },
repuestosList: {
    gap: SPACING.fixed.sm,
  },
section: { gap: SPACING.fixed.sm },
specBlock: { gap: SPACING.fixed.xs },
specChip: {
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.surfaceSoft,
  },
specChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.fixed.xs },
subtotalBox: {
    minHeight: 44,
    width: '100%',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
subtotalValue: {
    textAlign: 'right',
  },
summaryBox: {
    gap: SPACING.fixed.sm,
  },
summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: I.hairline,
  },
summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
totalValue: {
    fontSize: T.h3.fontSize,
  },
});
