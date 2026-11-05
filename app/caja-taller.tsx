import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  cuerpoDesdeEntrada,
  duenoCaja,
  esFalloCaja,
  etiquetaAncla,
  falloDesdeRespuesta,
  guardarIntentoIncierto,
  leerIntentoIncierto,
  mensajeResultadoAmbiguo,
  periodoMesHastaHoy,
  resultadoAmbiguo,
  validarPeriodo,
  type CuerpoCobro,
  type CuerpoCosto,
  type DuenoCaja,
  type FalloCaja,
  type GranularidadCaja,
  type IntentoCaja,
  type LibroCaja,
  type MovimientoCaja,
} from '@/utils/cajaTaller';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';

const periodoInicial = periodoMesHastaHoy();

function claveDueno(dueno: DuenoCaja | null): string {
  return dueno ? `${dueno.usuarioId}\n${dueno.tallerId}` : '';
}

export default function CajaTallerScreen() {
  const insets = useSafeAreaInsets();
  const { esMecanicoEquipo, usuario, estadoProveedor } = useAuth();
  const puedeRegistrar = !esMecanicoEquipo;
  const dueno = duenoCaja(usuario?.id, estadoProveedor?.proveedor_id);
  const duenoClave = claveDueno(dueno);
  const [desde, setDesde] = useState(periodoInicial.desde);
  const [hasta, setHasta] = useState(periodoInicial.hasta);
  const [granularidad, setGranularidad] = useState<GranularidadCaja>('mes');
  const [periodoPedido, setPeriodoPedido] = useState({ desde: periodoInicial.desde, hasta: periodoInicial.hasta });
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
  const intentoCobro = useRef<{ duenoClave: string; intento: IntentoCaja<CuerpoCobro> } | null>(null);
  const libroRef = useRef<LibroCaja | null>(null);
  const costoAmbiguo = useRef<{ serial: string; fallo: FalloCaja } | null>(null);
  const enviandoRef = useRef(false);
  const consultaRef = useRef({ desde, hasta, granularidad, pagina, paginaCasos });
  const consultaSeq = useRef(0);
  const [vistaDueno, setVistaDueno] = useState(duenoClave);
  const [intentoIncierto, setIntentoIncierto] = useState<IntentoCaja<CuerpoCobro> | null>(
    () => leerIntentoIncierto(dueno),
  );
  const [devolucion, setDevolucion] = useState<MovimientoCaja | null>(null);
  if (vistaDueno !== duenoClave) {
    setVistaDueno(duenoClave);
    setIntentoIncierto(leerIntentoIncierto(dueno));
    setAlta(null);
    setFalloAlta(null);
    setDevolucion(null);
    setNotaServidor(null);
    setFallo(null);
    setLibro(null);
  }

  const marcarIntento = (intento: IntentoCaja<CuerpoCobro> | null) => {
    const fijo = intento?.incierto ? intento : null;
    intentoCobro.current = intento ? { duenoClave, intento } : null;
    setIntentoIncierto(fijo);
    guardarIntentoIncierto(dueno, fijo);
  };

  const cargar = useCallback(async () => {
    const pedido = { ...consultaRef.current };
    const aviso = validarPeriodo(pedido.desde, pedido.hasta);
    setAvisoPeriodo(aviso);
    if (aviso) return;
    const seq = consultaSeq.current + 1;
    consultaSeq.current = seq;
    setPeriodoPedido({ desde: pedido.desde, hasta: pedido.hasta });
    setCargando(true);
    const cargado = libroRef.current;
    const mismoPeriodo = Boolean(
      cargado
      && cargado.desde === pedido.desde
      && cargado.hasta === pedido.hasta
      && cargado.granularidad === pedido.granularidad,
    );
    if (!mismoPeriodo) {
      libroRef.current = null;
      setLibro(null);
    }
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
      libroRef.current = respuesta;
      setLibro(respuesta);
      setFallo(null);
    } catch (error) {
      if (seq !== consultaSeq.current) return;
      const base = esFalloCaja(error) ? error : falloDesdeRespuesta(null, null);
      if (!resultadoAmbiguo(base.status)) {
        libroRef.current = null;
        setLibro(null);
      }
      setFallo(resultadoAmbiguo(base.status)
        ? { ...base, mensaje: mensajeResultadoAmbiguo(base.status, mismoPeriodo ? 'mismo' : 'otro') }
        : base);
    } finally {
      if (seq === consultaSeq.current) setCargando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void cargar();
  }, [cargar]));

  const duenoListo = Boolean(dueno);
  const duenoCargado = useRef<string | null>(null);
  useEffect(() => {
    if (!duenoListo) return;
    if (duenoCargado.current === duenoClave) return;
    const habiaCuenta = duenoCargado.current !== null;
    duenoCargado.current = duenoClave;
    if (!habiaCuenta) return;
    libroRef.current = null;
    costoAmbiguo.current = null;
    setLibro(null);
    void cargar();
  }, [duenoClave, duenoListo, cargar]);

  const consultar = () => {
    const aviso = validarPeriodo(desde, hasta);
    setAvisoPeriodo(aviso);
    if (aviso) return;
    setPagina(1);
    setPaginaCasos(1);
    consultaRef.current = { desde, hasta, granularidad, pagina: 1, paginaCasos: 1 };
    void cargar();
  };

  const confirmarCobro = async (cuerpo: CuerpoCobro) => {
    if (enviandoRef.current) return;
    const deEstaCuenta = intentoCobro.current?.duenoClave === duenoClave
      ? intentoCobro.current.intento
      : null;
    const previo = leerIntentoIncierto(dueno) ?? deEstaCuenta;
    const intento = claveParaIntento(previo, cuerpo);
    intentoCobro.current = { duenoClave, intento };
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
      if (resultadoAmbiguo(falloEnvio.status)) {
        marcarIntento({ ...intento, incierto: true });
      } else {
        intentoCobro.current = { duenoClave, intento: { ...intento, incierto: false } };
        guardarIntentoIncierto(dueno, null);
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
    const serial = JSON.stringify(cuerpo);
    const repetido = costoAmbiguo.current?.serial === serial ? costoAmbiguo.current.fallo : null;
    if (repetido) {
      setFalloAlta(repetido);
      return;
    }
    enviandoRef.current = true;
    setEnviando(true);
    try {
      await registrarCosto(cuerpo);
      costoAmbiguo.current = null;
      setFalloAlta(null);
      setAlta(null);
      await cargar();
    } catch (error) {
      const base = esFalloCaja(error) ? error : falloDesdeRespuesta(null, null);
      const falloCosto = resultadoAmbiguo(base.status)
        ? { ...base, mensaje: mensajeResultadoAmbiguo(base.status, 'costo') }
        : base;
      costoAmbiguo.current = resultadoAmbiguo(base.status) ? { serial, fallo: falloCosto } : null;
      setFalloAlta(falloCosto);
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
        onCambiarDesde={setDesde}
        onCambiarHasta={setHasta}
        onCambiarGranularidad={setGranularidad}
        onConsultar={consultar}
        avisoPeriodo={avisoPeriodo}
        periodoPedido={periodoPedido}
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
