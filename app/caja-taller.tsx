import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
  periodoMesHastaHoy,
  validarPeriodo,
  type CuerpoCobro,
  type CuerpoCosto,
  type FalloCaja,
  type GranularidadCaja,
  type IntentoCaja,
  type LibroCaja,
} from '@/utils/cajaTaller';

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

  const cargar = useCallback(async () => {
    const actual = consultaRef.current;
    const aviso = validarPeriodo(actual.desde, actual.hasta);
    setAvisoPeriodo(aviso);
    if (aviso) return;
    setCargando(true);
    try {
      const respuesta = await consultarCaja({
        desde: actual.desde,
        hasta: actual.hasta,
        granularidad: actual.granularidad,
        page: actual.pagina,
        casosPage: actual.paginaCasos,
      });
      setLibro(respuesta);
      setFallo(null);
    } catch (error) {
      setLibro(null);
      setFallo(esFalloCaja(error) ? error : falloDesdeRespuesta(null, null));
    } finally {
      setCargando(false);
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
    const intento = claveParaIntento(intentoCobro.current, cuerpo);
    intentoCobro.current = intento;
    enviandoRef.current = true;
    setEnviando(true);
    try {
      const guardado = await registrarCobro(intento.cuerpo, intento.clave);
      const ancla = anclaGuardada(intento.cuerpo, guardado);
      setNotaServidor(ancla.distinta
        ? `El servidor lo guardó en ${etiquetaAncla(ancla.ancla_tipo, ancla.ancla_id)}.`
        : null);
      intentoCobro.current = null;
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
});
