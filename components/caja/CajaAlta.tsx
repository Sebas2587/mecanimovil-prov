import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { BORDERS, COLORS, SPACING } from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { fechaRealIso, type AnclaTipo, type CuerpoCobro, type CuerpoCosto, type FalloCaja } from '@/utils/cajaTaller';

const I = COLORS.institutional;

type Modo = 'cobro' | 'costo';

type Props = {
  visible: boolean;
  modo: Modo;
  enviando: boolean;
  fallo: FalloCaja | null;
  /** Cuerpo fijo. Si la edición está bloqueada, confirmar reenvía este cuerpo y no el de los campos. */
  cobroInicial?: CuerpoCobro | null;
  edicionBloqueada?: boolean;
  entradaLegible?: string | null;
  onCerrar: () => void;
  onConfirmarCobro: (cuerpo: CuerpoCobro) => void;
  onConfirmarCosto: (cuerpo: CuerpoCosto) => void;
};

const ANCLAS: AnclaTipo[] = ['cita', 'solicitud', 'oferta'];

export function CajaAlta({
  visible,
  modo,
  enviando,
  fallo,
  cobroInicial = null,
  edicionBloqueada = false,
  entradaLegible = null,
  onCerrar,
  onConfirmarCobro,
  onConfirmarCosto,
}: Props) {
  const [paso, setPaso] = useState<'editar' | 'revisar'>(edicionBloqueada ? 'revisar' : 'editar');
  const [anclaTipo, setAnclaTipo] = useState<AnclaTipo>(cobroInicial?.ancla_tipo ?? 'cita');
  const [anclaId, setAnclaId] = useState(cobroInicial?.ancla_id ?? '');
  const [tipo, setTipo] = useState<'entrada' | 'reembolso'>(cobroInicial?.tipo ?? 'entrada');
  const [componente, setComponente] = useState<'total' | 'repuestos' | 'servicio'>(cobroInicial?.componente ?? 'total');
  const [tipoCosto, setTipoCosto] = useState<'registrado' | 'estimado'>('registrado');
  const [monto, setMonto] = useState(cobroInicial ? String(cobroInicial.monto_clp) : '');
  const [fecha, setFecha] = useState(cobroInicial?.fecha_efectiva ?? '');
  const [origenId, setOrigenId] = useState(cobroInicial?.movimiento_origen_id ?? '');
  const [motivo, setMotivo] = useState(cobroInicial?.motivo ?? '');
  const [nota, setNota] = useState('');
  const [confirmarSobrepago, setConfirmarSobrepago] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const cerrar = () => {
    if (enviando) return;
    setPaso('editar');
    setAviso(null);
    onCerrar();
  };

  const preparar = () => {
    const id = anclaId.trim();
    if (!id) {
      setAviso('Falta el id del caso.');
      return;
    }
    if (!/^\d+$/.test(monto.trim())) {
      setAviso('El monto tiene que ser un entero en pesos.');
      return;
    }
    const montoClp = Number(monto.trim());
    if (modo === 'cobro' && montoClp < 1) {
      setAviso('El cobro tiene que ser mayor a cero.');
      return;
    }
    if (modo === 'cobro' && !fechaRealIso(fecha.trim())) {
      setAviso('La fecha efectiva no existe. Usa un día real, con forma YYYY-MM-DD.');
      return;
    }
    if (modo === 'cobro' && tipo === 'reembolso' && !origenId.trim()) {
      setAviso('La devolución manual necesita el movimiento de origen. Mercado Pago no se anota aquí.');
      return;
    }
    setAviso(null);
    setPaso('revisar');
  };

  const confirmar = () => {
    if (enviando) return;
    const montoClp = Number(monto.trim());
    if (modo === 'cobro') {
      onConfirmarCobro(edicionBloqueada && cobroInicial ? cobroInicial : {
        ancla_tipo: anclaTipo,
        ancla_id: anclaId.trim(),
        tipo,
        componente,
        monto_clp: montoClp,
        fecha_efectiva: fecha.trim(),
        movimiento_origen_id: tipo === 'reembolso' ? origenId.trim() : null,
        motivo: motivo.trim(),
        confirmar_sobrepago: confirmarSobrepago,
      });
      return;
    }
    onConfirmarCosto({
      ancla_tipo: anclaTipo,
      ancla_id: anclaId.trim(),
      componente: componente === 'total' ? 'repuestos' : componente,
      tipo: tipoCosto,
      monto_clp: montoClp,
      nota: nota.trim(),
    });
  };

  const titulo = modo === 'cobro' ? 'Registrar cobro' : 'Registrar costo';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={cerrar}
    >
      <View style={styles.capa}>
        <Pressable
          accessibilityLabel="Cerrar registro"
          accessibilityRole="button"
          onPress={cerrar}
          style={[StyleSheet.absoluteFill, styles.fondo]}
        />
        <View style={styles.hoja}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.cuerpo}>
            <InstitutionalText role="h4" color="ink">{titulo}</InstitutionalText>
            <InstitutionalText role="caption" color="muted">
              Abrir este formulario no envía nada. Revisa el total antes de confirmar. La devolución de Mercado Pago la confirma el servidor: aquí no se calcula el acumulado.
            </InstitutionalText>
            {paso === 'editar' ? (
              <>
                <InstitutionalText role="caption" color="muted">Caso</InstitutionalText>
                <View style={styles.opciones}>
                  {ANCLAS.map((opcion) => (
                    <Opcion key={opcion} label={opcion} activo={anclaTipo === opcion} onPress={() => setAnclaTipo(opcion)} />
                  ))}
                </View>
                <Campo label="Id del caso" valor={anclaId} onChange={setAnclaId} />
                {modo === 'cobro' ? (
                  <>
                    <View style={styles.opciones}>
                      <Opcion label="Cobro" activo={tipo === 'entrada'} onPress={() => setTipo('entrada')} />
                      <Opcion label="Devolución" activo={tipo === 'reembolso'} onPress={() => setTipo('reembolso')} />
                    </View>
                    <View style={styles.opciones}>
                      {(['total', 'repuestos', 'servicio'] as const).map((opcion) => (
                        <Opcion key={opcion} label={opcion} activo={componente === opcion} onPress={() => setComponente(opcion)} />
                      ))}
                    </View>
                    <Campo label="Monto en pesos" valor={monto} onChange={setMonto} numeric />
                    <Campo label="Fecha efectiva" valor={fecha} onChange={setFecha} />
                    {tipo === 'reembolso' ? (
                      entradaLegible ? (
                        <InstitutionalText role="caption" color="ink">{entradaLegible}</InstitutionalText>
                      ) : (
                        <Campo label="Movimiento de origen" valor={origenId} onChange={setOrigenId} />
                      )
                    ) : null}
                    <Campo label="Motivo" valor={motivo} onChange={setMotivo} />
                  </>
                ) : (
                  <>
                    <View style={styles.opciones}>
                      <Opcion label="Repuestos" activo={componente !== 'servicio'} onPress={() => setComponente('repuestos')} />
                      <Opcion label="Servicio" activo={componente === 'servicio'} onPress={() => setComponente('servicio')} />
                    </View>
                    <View style={styles.opciones}>
                      <Opcion label="Registrado" activo={tipoCosto === 'registrado'} onPress={() => setTipoCosto('registrado')} />
                      <Opcion label="Estimado" activo={tipoCosto === 'estimado'} onPress={() => setTipoCosto('estimado')} />
                    </View>
                    <Campo label="Monto en pesos" valor={monto} onChange={setMonto} numeric />
                    <Campo label="Nota" valor={nota} onChange={setNota} />
                  </>
                )}
                {aviso ? <InstitutionalText role="caption" color="primary">{aviso}</InstitutionalText> : null}
                <Pressable accessibilityRole="button" accessibilityLabel="Revisar antes de enviar" onPress={preparar} style={styles.primario}>
                  <InstitutionalText role="captionBold" color="onPrimary">Revisar</InstitutionalText>
                </Pressable>
              </>
            ) : (
              <>
                <InstitutionalText role="body" color="ink">
                  {`${anclaTipo} ${anclaId.trim()}`}
                </InstitutionalText>
                <InstitutionalText role="h4" color="ink">{formatearMontoCLP(Number(monto))}</InstitutionalText>
                {modo === 'cobro' ? (
                  <InstitutionalText role="caption" color="muted">
                    {`${tipo === 'reembolso' ? 'Devolución' : 'Cobro'} · ${componente} · ${fecha.trim()}`}
                  </InstitutionalText>
                ) : (
                  <InstitutionalText role="caption" color="muted">
                    {`Costo ${tipoCosto} · ${componente === 'servicio' ? 'servicio' : 'repuestos'}`}
                  </InstitutionalText>
                )}
                {modo === 'cobro' && tipo === 'reembolso' ? (
                  <InstitutionalText role="caption" color="muted">
                    {`Origen ${origenId.trim()}. No borra el cobro original.`}
                  </InstitutionalText>
                ) : null}
                {fallo?.code === 'sobrepago' ? (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: confirmarSobrepago }}
                    onPress={() => setConfirmarSobrepago((actual) => !actual)}
                    style={styles.opcion}
                  >
                    <InstitutionalText role="caption" color="ink">
                      {confirmarSobrepago ? 'Sobrepago confirmado' : 'Confirmar sobrepago'}
                    </InstitutionalText>
                  </Pressable>
                ) : null}
                {fallo ? (
                  <InstitutionalText role="caption" color="primary">
                    {fallo.code ? `${fallo.mensaje} (${fallo.code})` : fallo.mensaje}
                  </InstitutionalText>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirmar envío"
                  accessibilityState={{ disabled: enviando }}
                  disabled={enviando}
                  onPress={confirmar}
                  style={styles.primario}
                >
                  <InstitutionalText role="captionBold" color="onPrimary">
                    {enviando ? 'Enviando' : 'Confirmar envío'}
                  </InstitutionalText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={edicionBloqueada ? 'Reintentar antes de editar' : 'Volver a editar'}
                  onPress={() => {
                    if (edicionBloqueada) {
                      setAviso('Este envío no tuvo respuesta. Reintenta estos mismos datos antes de editarlos.');
                      return;
                    }
                    setPaso('editar');
                  }}
                  style={styles.secundario}
                >
                  <InstitutionalText role="captionBold" color="ink">
                    {edicionBloqueada ? 'Reintentar antes de editar' : 'Volver'}
                  </InstitutionalText>
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Opcion({ label, activo, onPress }: { label: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: activo }} onPress={onPress} style={[styles.opcion, activo && styles.opcionActiva]}>
      <InstitutionalText role="captionBold" color={activo ? 'onPrimary' : 'ink'}>{label}</InstitutionalText>
    </Pressable>
  );
}

function Campo({
  label,
  valor,
  onChange,
  numeric = false,
}: {
  label: string;
  valor: string;
  onChange: (valor: string) => void;
  numeric?: boolean;
}) {
  return (
    <View style={styles.campo}>
      <InstitutionalText role="caption" color="muted">{label}</InstitutionalText>
      <TextInput
        accessibilityLabel={label}
        value={valor}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        inputMode={numeric ? 'numeric' : 'text'}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  capa: { flex: 1, justifyContent: 'flex-end' },
  fondo: { backgroundColor: I.surfaceDark },
  hoja: {
    maxHeight: '88%',
    backgroundColor: I.paper,
    borderTopLeftRadius: BORDERS.radius.xl,
    borderTopRightRadius: BORDERS.radius.xl,
    paddingBottom: SPACING.fixed.lg,
  },
  cuerpo: { padding: SPACING.fixed.md, gap: SPACING.fixed.sm },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.fixed.xs },
  opcion: {
    minHeight: 44,
    paddingHorizontal: SPACING.fixed.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceSoft,
  },
  opcionActiva: { backgroundColor: I.primary },
  campo: { gap: SPACING.fixed.xs },
  input: {
    minHeight: 44,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.sm,
    paddingHorizontal: SPACING.fixed.sm,
    color: I.ink,
    backgroundColor: I.paper,
    fontSize: 16,
  },
  primario: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDERS.radius.sm,
    backgroundColor: I.primary,
  },
  secundario: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDERS.radius.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
});
