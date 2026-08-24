import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalModal } from '@/app/design-system/components/InstitutionalModal';
import { Card } from '@/app/design-system/components';
import {
  institutionalInputPlaceholder,
  institutionalInputStyles,
} from '@/app/design-system/styles/institutionalInputs';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const MAX_ITEMS = 12;

function parsearNombres(texto: string): string[] {
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const raw of texto.split(/\r?\n|,/)) {
    const nombre = raw.replace(/\s+/g, ' ').trim();
    const clave = nombre.toLowerCase();
    if (!nombre || clave === 'repuesto' || vistos.has(clave)) continue;
    vistos.add(clave);
    out.push(nombre);
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

export function CotizarItemsIaModal({
  visible,
  onClose,
  onConfirm,
  loading = false,
  lineasSinPrecio = 0,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (nombres: string[]) => void;
  loading?: boolean;
  lineasSinPrecio?: number;
}) {
  const [texto, setTexto] = useState('');
  const nombres = useMemo(() => parsearNombres(texto), [texto]);
  const puedeEnviar = nombres.length > 0 || lineasSinPrecio > 0;

  useEffect(() => {
    if (!visible) setTexto('');
  }, [visible]);

  const handleClose = () => {
    if (loading) return;
    setTexto('');
    onClose();
  };

  const handleConfirm = () => {
    if (!puedeEnviar || loading) return;
    onConfirm(nombres);
  };

  return (
    <InstitutionalModal
      visible={visible}
      onRequestClose={handleClose}
      onClose={handleClose}
      title="Cotizar ítems con IA"
      footer={
        <View style={styles.footer}>
          <InstitutionalButton
            label={loading ? 'Buscando precios…' : 'Cotizar con IA'}
            variant="primary"
            loading={loading}
            disabled={!puedeEnviar}
            onPress={handleConfirm}
            leading={
              loading ? null : (
                <Sparkles size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              )
            }
          />
          <InstitutionalButton
            label="Cancelar"
            variant="outline"
            onPress={handleClose}
            disabled={loading}
          />
        </View>
      }
    >
      <View style={styles.body}>
        <InstitutionalText role="caption" color="muted">
          Escribe lo que falta, un ítem por línea. La IA busca el precio y la fuente
          (tu catálogo, historial del taller o tiendas web). No cambia líneas que ya
          tienen precio.
        </InstitutionalText>
        {lineasSinPrecio > 0 ? (
          <InstitutionalText role="caption" color="ink">
            También cotizaremos {lineasSinPrecio}{' '}
            {lineasSinPrecio === 1 ? 'línea' : 'líneas'} que ya agregaste sin monto.
          </InstitutionalText>
        ) : null}
        <Card elevated padding="host" style={styles.inputCard}>
          <TextInput
            style={[institutionalInputStyles.input, styles.textArea]}
            value={texto}
            onChangeText={setTexto}
            placeholder={'Filtro de aceite\nPastillas de freno delanteras\nRodamiento piloto'}
            placeholderTextColor={institutionalInputPlaceholder}
            multiline
            editable={!loading}
            textAlignVertical="top"
            autoFocus
          />
        </Card>
        <InstitutionalText role="small" color="muted">
          {nombres.length}/{MAX_ITEMS} ítems nuevos
        </InstitutionalText>
      </View>
    </InstitutionalModal>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.sm,
  },
  inputCard: {
    padding: SPACING.fixed.sm,
  },
  textArea: {
    minHeight: 132,
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  footer: {
    gap: SPACING.fixed.xs,
  },
});
