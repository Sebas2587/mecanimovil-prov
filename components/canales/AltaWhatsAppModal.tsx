import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Check, MessageSquarePlus, Smartphone } from 'lucide-react-native';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  InstitutionalButton,
  InstitutionalText,
  institutionalInputPlaceholder,
  institutionalInputStyles,
  institutionalSelectionStyles,
} from '@/app/design-system/components';
import { InstitutionalModal } from '@/app/design-system/components/InstitutionalModal';
import type { ModoAltaWhatsApp, OpcionesAltaWhatsApp } from '@/services/omnichannelService';

const I = COLORS.institutional;
const PREFIJO_PAIS = '56';

const MODOS: { modo: ModoAltaWhatsApp; titulo: string; detalle: string; Icon: typeof Smartphone }[] = [
  {
    modo: 'app_whatsapp',
    titulo: 'Ya lo uso en WhatsApp Business',
    detalle:
      'El número sigue funcionando en la app del teléfono. Facebook muestra un código QR y lo escaneas desde WhatsApp Business.',
    Icon: Smartphone,
  },
  {
    modo: 'numero_nuevo',
    titulo: 'Número nuevo para el chat',
    detalle:
      'Un número que no esté en ninguna app de WhatsApp. Llega un código SMS y queda dedicado a Mecanimovil.',
    Icon: MessageSquarePlus,
  },
];

export type AltaWhatsAppModalProps = {
  visible: boolean;
  /** true cuando ya hay un número conectado y se va a reemplazar. */
  cambio: boolean;
  numeroActual?: string | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (opciones: Required<OpcionesAltaWhatsApp>) => void;
};

export function AltaWhatsAppModal({
  visible,
  cambio,
  numeroActual,
  loading = false,
  onClose,
  onConfirm,
}: AltaWhatsAppModalProps) {
  const [modo, setModo] = useState<ModoAltaWhatsApp>('app_whatsapp');
  const [digitos, setDigitos] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [visibleAnterior, setVisibleAnterior] = useState(visible);

  // Al abrir, vuelve al estado inicial (sin efecto: se deriva en render).
  if (visible !== visibleAnterior) {
    setVisibleAnterior(visible);
    if (visible) {
      setModo('app_whatsapp');
      setDigitos('');
      setError(null);
    }
  }

  const confirmar = () => {
    const limpio = digitos.replace(/\D/g, '');
    if (limpio.length < 8 || limpio.length > 12) {
      setError('Escribe el número completo, por ejemplo 9 1234 5678.');
      return;
    }
    setError(null);
    onConfirm({ modo, numero: `${PREFIJO_PAIS}${limpio}` });
  };

  return (
    <InstitutionalModal
      visible={visible}
      onClose={loading ? undefined : onClose}
      title={cambio ? 'Cambiar número de WhatsApp' : 'Conectar WhatsApp'}
      footer={
        <InstitutionalButton
          label="Continuar con Facebook"
          onPress={confirmar}
          loading={loading}
        />
      }
    >
      <View style={styles.body}>
        {cambio ? (
          <InstitutionalText role="caption" color="body">
            {numeroActual ? `${numeroActual} sigue conectado hasta que el nuevo quede listo. ` : ''}
            Tus chats y el historial se mantienen; a los clientes les respondes desde el número nuevo.
          </InstitutionalText>
        ) : (
          <InstitutionalText role="caption" color="body">
            Entras con el Facebook del taller. Un WhatsApp personal no se puede conectar.
          </InstitutionalText>
        )}

        <InstitutionalText role="label" color="ink">¿Cómo está ese número hoy?</InstitutionalText>
        <View style={styles.opciones}>
          {MODOS.map(({ modo: valor, titulo, detalle, Icon }) => {
            const activo = valor === modo;
            return (
              <TouchableOpacity
                key={valor}
                style={[
                  institutionalSelectionStyles.card,
                  activo && institutionalSelectionStyles.cardSelected,
                ]}
                onPress={() => setModo(valor)}
                disabled={loading}
                accessibilityRole="radio"
                accessibilityState={{ selected: activo }}
              >
                <View style={styles.opcionFila}>
                  <View
                    style={[
                      institutionalSelectionStyles.iconPlate,
                      activo && institutionalSelectionStyles.iconPlateSelected,
                    ]}
                  >
                    <Icon size={16} color={activo ? I.primary : I.body} strokeWidth={ICON_STROKE_WIDTH} />
                  </View>
                  <View style={styles.opcionTexto}>
                    <InstitutionalText
                      style={[
                        institutionalSelectionStyles.title,
                        activo && institutionalSelectionStyles.titleSelected,
                      ]}
                    >
                      {titulo}
                    </InstitutionalText>
                    <InstitutionalText style={institutionalSelectionStyles.description}>
                      {detalle}
                    </InstitutionalText>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      institutionalSelectionStyles.checkbox,
                      activo && institutionalSelectionStyles.checkboxSelected,
                    ]}
                  >
                    {activo ? <Check size={12} color={I.onPrimary} strokeWidth={3} /> : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={institutionalInputStyles.field}>
          <InstitutionalText style={institutionalInputStyles.label}>Número a conectar</InstitutionalText>
          <View style={[institutionalInputStyles.inputRow, error && institutionalInputStyles.inputError]}>
            <InstitutionalText style={institutionalInputStyles.inputRowPrefix}>+{PREFIJO_PAIS}</InstitutionalText>
            <TextInput
              style={institutionalInputStyles.inputRowField}
              value={digitos}
              onChangeText={(t) => {
                setDigitos(t.replace(/[^\d\s]/g, ''));
                if (error) setError(null);
              }}
              placeholder="9 1234 5678"
              placeholderTextColor={institutionalInputPlaceholder}
              keyboardType="phone-pad"
              autoComplete="tel"
              editable={!loading}
              maxLength={16}
            />
          </View>
          {error ? (
            <InstitutionalText style={institutionalInputStyles.errorText}>{error}</InstitutionalText>
          ) : (
            <InstitutionalText style={institutionalInputStyles.hint}>
              Si Facebook comparte varios números, conectamos este.
            </InstitutionalText>
          )}
        </View>
      </View>
    </InstitutionalModal>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACING.fixed.md },
  opciones: { gap: SPACING.fixed.sm },
  opcionFila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
    paddingRight: SPACING.fixed.lg,
  },
  opcionTexto: { flex: 1, minWidth: 0 },
  radio: { position: 'relative', top: 0, right: 0 },
});

export default AltaWhatsAppModal;
