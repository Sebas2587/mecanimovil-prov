import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Check, DollarSign, Plus, Trash2, Building2, Wrench, Package, FileText, Lock } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { InstitutionalButton } from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import cotizacionCanalService, { type CotizacionCanal, type RepuestoCotizacion } from '@/services/cotizacionCanalService';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { showAlert } from '@/utils/platformAlert';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

/** Helper para formatear cifras con puntos de miles (es-CL) mientras se escribe */
function formatCLPInput(val: string | number | undefined | null): string {
  if (val === null || val === undefined || val === '') return '';
  const digits = String(val).replace(/[^\d]/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  return isNaN(num) ? '' : num.toLocaleString('es-CL');
}

/** Helper para convertir texto formateado a entero numérico */
function parseCLP(val: string | number | undefined | null): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Math.round(val);
  const digits = String(val).replace(/[^\d]/g, '');
  return parseInt(digits, 10) || 0;
}

interface ModalAjusteBorradorProps {
  visible: boolean;
  cotizacion: CotizacionCanal | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModalAjusteBorrador({
  visible,
  cotizacion,
  onClose,
  onSuccess,
}: ModalAjusteBorradorProps) {
  const [manoObraStr, setManoObraStr] = useState<string>('');
  const [repuestos, setRepuestos] = useState<RepuestoCotizacion[]>([]);
  const [notasInternas, setNotasInternas] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Obtener la Casa de Repuestos / Vendedor real desde la cotización y repuestos
  const casaRepuestosReal = useMemo(() => {
    if (!cotizacion) return 'MercadoLibre Chile';
    const tiendasRepuestos = cotizacion.repuestos
      ?.map((r: any) => r.fuente_repuesto || r.fuente || r.proveedor || r.tienda || r.origen || r.vendedor)
      .filter((f): f is string => Boolean(f && typeof f === 'string' && f.trim()));

    if (tiendasRepuestos && tiendasRepuestos.length > 0) {
      return Array.from(new Set(tiendasRepuestos)).join(' • ');
    }

    const meta = (cotizacion.metadata || {}) as Record<string, any>;
    const tiendaMeta = meta.vehiculo_fuente || meta.casa_repuestos || meta.proveedor || meta.tienda || meta.origen || meta.fuente_repuestos;
    if (typeof tiendaMeta === 'string' && tiendaMeta.trim()) {
      return tiendaMeta.trim();
    }
    return 'MercadoLibre Chile';
  }, [cotizacion]);

  useEffect(() => {
    if (cotizacion) {
      const valMano = cotizacion.mano_obra_clp || 0;
      setManoObraStr(valMano > 0 ? formatCLPInput(valMano) : '');
      setRepuestos(cotizacion.repuestos ? [...cotizacion.repuestos] : []);
      setNotasInternas(cotizacion.notas_internas || '');
    }
  }, [cotizacion]);

  // Cálculos dinámicos (100% Coincidentes con la Cotización Pública Vercel y la API)
  const manoObraNum = parseCLP(manoObraStr);

  const totalRepuestosCalc = useMemo(() => {
    return repuestos.reduce(
      (acc, item) => acc + (parseCLP(item.precio_unitario_clp) * (Number(item.cantidad) || 1)),
      0
    );
  }, [repuestos]);

  const totalGeneralCalc = manoObraNum + totalRepuestosCalc;

  // Handlers con formateo en tiempo real al escribir
  const handleManoObraChange = (text: string) => {
    setManoObraStr(formatCLPInput(text));
  };

  const handlePrecioRepuestoChange = (index: number, text: string) => {
    const numericVal = parseCLP(text);
    setRepuestos((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], precio_unitario_clp: numericVal };
      }
      return next;
    });
  };

  const handleNombreRepuestoChange = (index: number, val: string) => {
    setRepuestos((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], nombre: val };
      }
      return next;
    });
  };

  const handleCantidadRepuestoChange = (index: number, val: string) => {
    const cant = Math.max(1, parseInt(val.replace(/\D/g, ''), 10) || 1);
    setRepuestos((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], cantidad: cant };
      }
      return next;
    });
  };

  const handleAgregarRepuesto = () => {
    setRepuestos((prev) => [
      ...prev,
      {
        nombre: 'Repuesto nuevo',
        cantidad: 1,
        precio_unitario_clp: 0,
        fuente_repuesto: casaRepuestosReal,
      },
    ]);
  };

  const handleEliminarRepuesto = (index: number) => {
    setRepuestos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGuardarYAprobar = useCallback(async () => {
    if (!cotizacion) return;
    try {
      setSaving(true);

      const patchData: Partial<CotizacionCanal> = {
        mano_obra_clp: manoObraNum,
        costo_repuestos_clp: totalRepuestosCalc,
        total_clp: totalGeneralCalc,
        repuestos,
        notas_internas: notasInternas,
      };

      await cotizacionCanalService.actualizar(cotizacion.id, patchData);
      await cotizacionCanalService.enviar(cotizacion.id);
      showAlert('Cotización Aprobada', 'La cotización fue enviada al cliente con éxito.');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error guardando cotización:', error);
      showAlert('Error', error?.message || 'No se pudo guardar la cotización.');
    } finally {
      setSaving(false);
    }
  }, [cotizacion, manoObraNum, totalRepuestosCalc, totalGeneralCalc, repuestos, notasInternas, onSuccess, onClose]);

  if (!cotizacion) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header estilo Airbnb */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Ajustar Cotización #{cotizacion.id}</Text>
              <Text style={styles.headerSubtitle}>
                {cotizacion.cliente_nombre || 'Cliente'} • {cotizacion.vehiculo_marca} {cotizacion.vehiculo_modelo} {cotizacion.vehiculo_patente ? `(${cotizacion.vehiculo_patente.toUpperCase()})` : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={I.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Mano de Obra (Neto) */}
            <View style={styles.section}>
              <View style={styles.kickerRow}>
                <Wrench size={16} color={COLORS.brand.magenta} style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>Mano de Obra (Neto)</Text>
              </View>
              <View style={styles.airbnbCardInput}>
                <Text style={styles.currencyPrefix}>$</Text>
                <TextInput
                  style={[styles.textInputAirbnb, styles.monoFont]}
                  keyboardType="numeric"
                  value={manoObraStr}
                  onChangeText={handleManoObraChange}
                  placeholder="0"
                  placeholderTextColor={I.muted}
                />
              </View>
              <Text style={styles.fieldHint}>
                Escribe la cifra y se formateará con puntos de miles automáticamente.
              </Text>
            </View>

            {/* Repuestos & Materiales */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.kickerRow}>
                  <Package size={16} color={COLORS.brand.magenta} style={{ marginRight: 6 }} />
                  <Text style={styles.sectionTitle}>Repuestos y Materiales</Text>
                </View>
                <TouchableOpacity
                  style={styles.addRepuestoBtn}
                  onPress={handleAgregarRepuesto}
                  activeOpacity={0.7}
                >
                  <Plus size={16} color={COLORS.brand.magenta} />
                  <Text style={styles.addRepuestoText}>Agregar Repuesto</Text>
                </TouchableOpacity>
              </View>

              {repuestos.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No hay repuestos registrados en este borrador.</Text>
                </View>
              ) : (
                repuestos.map((item, idx) => {
                  const unitPriceStr = item.precio_unitario_clp > 0 ? formatCLPInput(item.precio_unitario_clp) : '';
                  const itemSubtotal = (parseCLP(item.precio_unitario_clp) * (Number(item.cantidad) || 1));
                  const fuenteActual = (item as any).fuente_repuesto || (item as any).fuente || (item as any).proveedor || (item as any).tienda || casaRepuestosReal;

                  return (
                    <View key={idx} style={styles.repuestoCardAirbnb}>
                      <View style={styles.repuestoTopRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.microLabel}>NOMBRE DEL REPUESTO</Text>
                          <TextInput
                            style={[styles.textInputAirbnb, styles.repuestoNombreInput]}
                            value={item.nombre}
                            onChangeText={(val) => handleNombreRepuestoChange(idx, val)}
                            placeholder="Nombre del repuesto (ej: Kit Embrague)"
                            placeholderTextColor={I.muted}
                          />
                        </View>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleEliminarRepuesto(idx)}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={18} color={COLORS.institutional.semanticDown} />
                        </TouchableOpacity>
                      </View>

                      {/* Origen del Repuesto (SOLO USO INTERNO DEL TALLER, NO VISIBLE AL CLIENTE) */}
                      <View style={styles.repuestoSubTag}>
                        <Building2 size={12} color={COLORS.brand.magenta} style={{ marginRight: 4 }} />
                        <Text style={styles.repuestoSubTagText} numberOfLines={1}>
                          Tienda ML: {fuenteActual}
                        </Text>
                      </View>

                      {/* Cantidad y Precio Unitario */}
                      <View style={styles.repuestoGrid}>
                        <View style={{ width: 80 }}>
                          <Text style={styles.microLabel}>CANTIDAD</Text>
                          <TextInput
                            style={[styles.textInputAirbnb, { textAlign: 'center' }]}
                            keyboardType="numeric"
                            value={String(item.cantidad || 1)}
                            onChangeText={(val) => handleCantidadRepuestoChange(idx, val)}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.microLabel}>PRECIO UNIT. (NETO)</Text>
                          <View style={styles.airbnbCardInputCompact}>
                            <Text style={styles.currencyPrefixSmall}>$</Text>
                            <TextInput
                              style={[styles.textInputAirbnbSmall, styles.monoFont]}
                              keyboardType="numeric"
                              value={unitPriceStr}
                              onChangeText={(val) => handlePrecioRepuestoChange(idx, val)}
                              placeholder="0"
                              placeholderTextColor={I.muted}
                            />
                          </View>
                        </View>

                        <View style={{ width: 100, alignItems: 'flex-end' }}>
                          <Text style={styles.microLabelRight}>SUBTOTAL</Text>
                          <Text style={styles.subtotalValText}>{formatearMontoCLP(itemSubtotal)}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Notas u Observaciones */}
            <View style={styles.section}>
              <View style={styles.kickerRow}>
                <FileText size={16} color={I.body} style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>Notas y Observaciones para el Cliente</Text>
              </View>
              <View style={[styles.airbnbCardInput, { height: 72, alignItems: 'flex-start', paddingVertical: 8 }]}>
                <TextInput
                  style={[styles.textInputAirbnb, { textAlignVertical: 'top' }]}
                  multiline
                  value={notasInternas}
                  onChangeText={setNotasInternas}
                  placeholder="Instrucciones o recomendaciones adicionales para el cliente..."
                  placeholderTextColor={I.muted}
                />
              </View>
            </View>

            {/* Total Resumen Financiero (100% Coincidente con Vercel) */}
            <View style={styles.totalBoxAirbnb}>
              <Text style={styles.totalBoxTitle}>Resumen de Cotización</Text>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Mano de Obra:</Text>
                <Text style={styles.totalVal}>{formatearMontoCLP(manoObraNum)}</Text>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Repuestos:</Text>
                <Text style={styles.totalVal}>{formatearMontoCLP(totalRepuestosCalc)}</Text>
              </View>

              <View style={[styles.totalRow, styles.totalRowGrand]}>
                <Text style={styles.grandTotalLabel}>TOTAL FINAL (IVA incl.):</Text>
                <Text style={styles.grandTotalVal}>{formatearMontoCLP(totalGeneralCalc)}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer de Aprobación */}
          <View style={styles.footer}>
            <InstitutionalButton
              label={`Aprobar y Enviar (${formatearMontoCLP(totalGeneralCalc)})`}
              onPress={handleGuardarYAprobar}
              disabled={saving}
              loading={saving}
              variant="primary"
              leading={<Check size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: COLORS.base.white,
    borderTopLeftRadius: BORDERS.radius.xl,
    borderTopRightRadius: BORDERS.radius.xl,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.fixed.lg,
    paddingVertical: SPACING.fixed.md,
    borderBottomWidth: 1,
    borderBottomColor: I.hairline,
  },
  headerTitle: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    color: I.ink,
  },
  headerSubtitle: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    color: I.body,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: BORDERS.radius.full,
    backgroundColor: I.surfaceSoft,
  },
  body: {
    paddingHorizontal: SPACING.fixed.lg,
    paddingTop: SPACING.fixed.md,
  },
  section: {
    marginBottom: SPACING.fixed.lg,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.fixed.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.fixed.xs,
  },
  sectionTitle: {
    fontFamily: FF.sansBold,
    fontSize: TYPOGRAPHY.styles.bodyBold.fontSize,
    color: I.ink,
  },
  sourceInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: I.surfaceSoft,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.md,
  },
  sourceBadgeTitle: {
    fontFamily: FF.sansBold,
    fontSize: TYPOGRAPHY.styles.bodyBold.fontSize,
    color: I.ink,
  },
  sourceBadgeSub: {
    fontFamily: FF.sansRegular,
    fontSize: 11,
    color: I.body,
    marginTop: 2,
    lineHeight: 16,
  },
  airbnbCardInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.base.white,
    paddingHorizontal: SPACING.fixed.md,
    height: 48,
  },
  airbnbCardInputCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: COLORS.base.white,
    paddingHorizontal: 8,
    height: 38,
  },
  currencyPrefix: {
    fontFamily: FF.sansBold,
    fontSize: TYPOGRAPHY.styles.bodyBold.fontSize,
    color: I.ink,
    marginRight: 6,
  },
  currencyPrefixSmall: {
    fontFamily: FF.sansMedium,
    fontSize: 12,
    color: I.body,
    marginRight: 4,
  },
  textInputAirbnb: {
    flex: 1,
    fontFamily: FF.sansMedium,
    fontSize: TYPOGRAPHY.styles.body.fontSize,
    color: I.ink,
  },
  repuestoNombreInput: {
    fontFamily: FF.sansBold,
    fontSize: 14,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.base.white,
    paddingHorizontal: SPACING.fixed.sm,
    height: 40,
    marginTop: 2,
  },
  textInputAirbnbSmall: {
    flex: 1,
    fontFamily: FF.sansMedium,
    fontSize: 13,
    color: I.ink,
  },
  monoFont: {
    fontFamily: FF.monoMedium,
  },
  fieldHint: {
    fontFamily: FF.sansRegular,
    fontSize: 11,
    color: I.muted,
    marginTop: 4,
  },
  addRepuestoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addRepuestoText: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    color: COLORS.brand.magenta,
    marginLeft: 4,
  },
  emptyCard: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.md,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    color: I.muted,
    fontStyle: 'italic',
  },
  repuestoCardAirbnb: {
    backgroundColor: COLORS.base.white,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.fixed.md,
    marginBottom: SPACING.fixed.xs,
    gap: SPACING.fixed.xs,
  },
  repuestoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 4,
  },
  repuestoSubTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  repuestoSubTagText: {
    fontFamily: FF.sansMedium,
    fontSize: 11,
    color: I.ink,
  },
  repuestoComentarioText: {
    fontFamily: FF.sansRegular,
    fontSize: 11,
    color: I.body,
    fontStyle: 'italic',
    marginTop: 2,
  },
  repuestoGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    marginTop: 4,
  },
  microLabel: {
    fontFamily: FF.sansSemiBold,
    fontSize: 9,
    color: I.muted,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  microLabelRight: {
    fontFamily: FF.sansSemiBold,
    fontSize: 9,
    color: I.muted,
    marginBottom: 2,
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  subtotalValText: {
    fontFamily: FF.sansBold,
    fontSize: 13,
    color: I.ink,
    lineHeight: 38,
  },
  totalBoxAirbnb: {
    backgroundColor: I.surfaceSoft,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.fixed.md,
    marginBottom: SPACING.fixed.xl,
  },
  totalBoxTitle: {
    fontFamily: FF.sansBold,
    fontSize: TYPOGRAPHY.styles.bodyBold.fontSize,
    color: I.ink,
    marginBottom: SPACING.fixed.xs,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  subtotalBorder: {
    borderTopWidth: 1,
    borderTopColor: I.hairline,
    marginTop: 4,
    paddingTop: 6,
  },
  totalRowGrand: {
    borderTopWidth: 1,
    borderTopColor: I.hairline,
    marginTop: 6,
    paddingTop: 8,
  },
  totalLabel: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    color: I.body,
  },
  totalVal: {
    fontFamily: FF.sansMedium,
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    color: I.ink,
  },
  subtotalLabel: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    color: I.ink,
  },
  subtotalVal: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    color: I.ink,
  },
  ivaLabel: {
    fontFamily: FF.sansBold,
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    color: COLORS.brand.magenta,
  },
  ivaVal: {
    fontFamily: FF.sansBold,
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    color: COLORS.brand.magenta,
  },
  grandTotalLabel: {
    fontFamily: FF.sansBold,
    fontSize: TYPOGRAPHY.styles.bodyBold.fontSize,
    color: I.ink,
  },
  grandTotalVal: {
    fontFamily: FF.sansBold,
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    color: COLORS.brand.magenta,
  },
  footer: {
    paddingHorizontal: SPACING.fixed.lg,
    paddingTop: SPACING.fixed.xs,
  },
});

