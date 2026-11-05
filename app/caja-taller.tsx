import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/app/design-system/tokens';
import Header from '@/components/Header';
import { CajaAlta } from '@/components/caja/CajaAlta';
import { CajaLibro } from '@/components/caja/CajaLibro';
import { useAuth } from '@/context/AuthContext';
import { consultarCaja, registrarCobro, registrarCosto } from '@/services/cajaTallerService';
import {
  anclaGuardada,
  claveParaIntento,
  esFalloCaja,
  etiquetaAncla,
  falloDesdeRespuesta,
  guardarIntentoIncierto,
  leerIntentoIncierto,
  periodoMesHastaHoy,
  validarPeriodo,
  type CuerpoCobro,
  type CuerpoCosto,
  type FalloCaja,
  type GranularidadCaja,
  type IntentoCaja,
  type LibroCaja,
  type MovimientoCaja,
} from '@/utils/cajaTaller';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';

function cuerpoDesdeEntrada(movimiento: MovimientoCaja): CuerpoCobro {
  const componente = movimiento.componente === 'repuestos' || movimiento.componente === 'servicio'
    ? movimiento.componente
    : 'total';
  const ancla = movimiento.ancla_tipo === 'solicitud' || movimiento.ancla_tipo === 'oferta'
    ? movimiento.ancla_tipo
    : 'cita';
  return {
    ancla_tipo: ancla,
    ancla_id: String(movimiento.ancla_id),
    tipo: 'reembolso',
    componente,
    monto_clp: movimiento.monto_clp,
    fecha_efectiva: movimiento.fecha_efectiva,
    movimiento_origen_id: movimiento.id,
    motivo: '',
    confirmar_sobrepago: false,
  };
}

const periodoInicial = periodoMesHastaHoy();

export default function CajaTallerScreen() {
  const insets = useSafeAreaInsets();
  const { esMecanicoEquipo } = useAuth();
  const puedeRegistrar = !esMecanicoEquipo;
  const [desde, setDesde] = useState(periodoInicial.desde);
  const [hasta, setHasta] = useState(periodoInicial.hasta);
  const [granularidad, setGranularidad] = useState<GranularidadCaja>('mes');
  const [pagina, setPagina] = useState(1);
  const [paginaCasos, setPaginaCasos] = useState(1);
  const [libro, setLibro] = useState<LibroCaja | null>(null);
  const [fallo, setFallo] = useState<FalloCaja | null>(null);
  const [cargando, setCargando] = useState(false);
  const [avisoPeriodo, setAvisoPeriodo] = useState<string | null>(null);
  const [notaServidor, setNotaServidor] = useState<string | null>(null);
  const [alta, setAlta] = useState<null | 'cobro' | 'costo'>(null);
  const [enviando, setEnviando] = useState(false);
  const [falloAlta, setFalloAlta] = useState<FalloCaja | null>(null);
  const intentoCobro = useRef<IntentoCaja<CuerpoCobro> | null>(null);
  const enviandoRef = useRef(false);
  const consultaRef = useRef({ desde, hasta, granularidad, pagina, paginaCasos });
  const consultaSeq = useRef(0);
  const [intentoIncierto, setIntentoIncierto] = useState<IntentoCaja<CuerpoCobro> | null>(
    () => leerIntentoIncierto(),
  );
  const [devolucion, setDevolucion] = useState<MovimientoCaja | null>(null);

  const marcarIntento = (intento: IntentoCaja<CuerpoCobro> | null) => {
    const fijo = intento?.incierto ? intento : null;
    intentoCobro.current = intento;
    setIntentoIncierto(fijo);
    guardarIntentoIncierto(fijo);
  };

  const cargar = useCallback(async () => {
    const pedido = { ...consultaRef.current };
    const aviso = validarPeriodo(pedido.desde, pedido.hasta);
    setAvisoPeriodo(aviso);
    if (aviso) return;
    const seq = consultaSeq.current + 1;
    consultaSeq.current = seq;
    setCargando(true);
    setLibro((actual) => (
      actual
      && (actual.desde !== pedido.desde || actual.hasta !== pedido.hasta || actual.granularidad !== pedido.granularidad)
        ? null
        : actual
    ));
    try {
      const respuesta = await consultarCaja({
        desde: pedido.desde,
        hasta: pedido.hasta,
        granularidad: pedido.granularidad,
        page: pedido.pagina,
        casosPage: pedido.paginaCasos,
      });
      if (seq !== consultaSeq.current) return;
      if (respuesta.desde !== pedido.desde || respuesta.hasta !== pedido.hasta) return;
      setLibro(respuesta);
      setFallo(null);
    } catch (error) {
      if (seq !== consultaSeq.current) return;
      setLibro(null);
      setFallo(esFalloCaja(error) ? error : falloDesdeRespuesta(null, null));
    } finally {
      if (seq === consultaSeq.current) setCargando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void cargar();
  }, [cargar]));

  const consultar = () => {
    setPagina(1);
    setPaginaCasos(1);
    consultaRef.current = { ...consultaRef.current, pagina: 1, paginaCasos: 1 };
    void cargar();
  };

  const confirmarCobro = async (cuerpo: CuerpoCobro) => {
    if (enviandoRef.current) return;
    const previo = leerIntentoIncierto() ?? intentoCobro.current;
    const intento = claveParaIntento(previo, cuerpo);
    intentoCobro.current = intento;
    enviandoRef.current = true;
    setEnviando(true);
    try {
      const guardado = await registrarCobro(intento.cuerpo, intento.clave);
      const ancla = anclaGuardada(intento.cuerpo, guardado);
      setNotaServidor(ancla.distinta
        ? `El servidor lo guardó en ${etiquetaAncla(ancla.ancla_tipo, ancla.ancla_id)}.`
        : null);
      marcarIntento(null);
      setDevolucion(null);
      setFalloAlta(null);
      setAlta(null);
      await cargar();
    } catch (error) {
      const falloEnvio = esFalloCaja(error) ? error : falloDesdeRespuesta(null, null);
      if (falloEnvio.status == null) {
        marcarIntento({ ...intento, incierto: true });
      } else {
        intentoCobro.current = { ...intento, incierto: false };
        guardarIntentoIncierto(null);
        setIntentoIncierto(null);
      }
      setFalloAlta(falloEnvio);
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  const confirmarCosto = async (cuerpo: CuerpoCosto) => {
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    try {
      await registrarCosto(cuerpo);
      setFalloAlta(null);
      setAlta(null);
      await cargar();
    } catch (error) {
      setFalloAlta(esFalloCaja(error) ? error : falloDesdeRespuesta(null, null));
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  return (
    <View style={[styles.pantalla, { paddingBottom: insets.bottom }]}>
      <Header title="Caja del taller" showBack />
      {intentoIncierto && alta !== 'cobro' ? (
        <View style={styles.aviso}>
          <InstitutionalText role="caption" color="ink">
            {`Un cobro de ${formatearMontoCLP(intentoIncierto.cuerpo.monto_clp)} quedó sin respuesta. Reinténtalo antes de registrar otro.`}
          </InstitutionalText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reintentar el mismo envío"
            onPress={() => {
              setDevolucion(null);
              setAlta('cobro');
              void confirmarCobro(intentoIncierto.cuerpo);
            }}
          >
            <InstitutionalText role="captionBold" color="primary">Reintentar el mismo envío</InstitutionalText>
          </Pressable>
        </View>
      ) : null}
      <CajaLibro
        desde={desde}
        hasta={hasta}
        granularidad={granularidad}
        onCambiarDesde={(valor) => {
          setDesde(valor);
          consultaRef.current = { ...consultaRef.current, desde: valor };
        }}
        onCambiarHasta={(valor) => {
          setHasta(valor);
          consultaRef.current = { ...consultaRef.current, hasta: valor };
        }}
        onCambiarGranularidad={(valor) => {
          setGranularidad(valor);
          consultaRef.current = { ...consultaRef.current, granularidad: valor };
        }}
        onConsultar={consultar}
        avisoPeriodo={avisoPeriodo}
        cargando={cargando}
        fallo={fallo}
        libro={libro}
        onPaginaMovimientos={(siguiente) => {
          setPagina(siguiente);
          consultaRef.current = { ...consultaRef.current, pagina: siguiente };
          void cargar();
        }}
        onPaginaCasos={(siguiente) => {
          setPaginaCasos(siguiente);
          consultaRef.current = { ...consultaRef.current, paginaCasos: siguiente };
          void cargar();
        }}
        puedeRegistrar={puedeRegistrar}
        puedeCosto={puedeRegistrar}
        onRegistrarCobro={() => {
          if (intentoIncierto) {
            setDevolucion(null);
            setFalloAlta(falloDesdeRespuesta(null, null));
            setAlta('cobro');
            return;
          }
          setDevolucion(null);
          setFalloAlta(null);
          setAlta('cobro');
        }}
        onDevolverEntrada={(movimiento) => {
          if (intentoIncierto) {
            setFalloAlta(falloDesdeRespuesta(null, null));
            setAlta('cobro');
            return;
          }
          setDevolucion(movimiento);
          setFalloAlta(null);
          setAlta('cobro');
        }}
        onRegistrarCosto={() => {
          setFalloAlta(null);
          setAlta('costo');
        }}
        notaServidor={notaServidor}
      />
      {alta ? (
        <CajaAlta
          visible
          modo={alta}
          enviando={enviando}
          fallo={falloAlta}
          cobroInicial={intentoIncierto?.cuerpo ?? (devolucion ? cuerpoDesdeEntrada(devolucion) : null)}
          edicionBloqueada={Boolean(intentoIncierto)}
          entradaLegible={devolucion && !intentoIncierto
            ? `Devolución del cobro del ${devolucion.fecha_local} por ${formatearMontoCLP(devolucion.monto_clp)}.`
            : null}
          onCerrar={() => {
            if (enviandoRef.current) return;
            setAlta(null);
          }}
          onConfirmarCobro={(cuerpo) => { void confirmarCobro(cuerpo); }}
          onConfirmarCosto={(cuerpo) => { void confirmarCosto(cuerpo); }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORS.institutional.canvas },
  aviso: { paddingHorizontal: 16, paddingVertical: 8, gap: 4 },
});
