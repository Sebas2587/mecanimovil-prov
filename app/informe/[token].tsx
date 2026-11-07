import { useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import SignaturePad, { type SignaturePadRef } from '@/components/signature/SignaturePad';
import { publicApiBase } from '@/utils/publicApiBase';

const I = COLORS.institutional;
const CANVAS_HEIGHT = 180;

type InformeFoto = {
  id?: number;
  descripcion?: string;
  imagen_url?: string;
};

type InformeItem = {
  id?: number | string;
  pregunta_texto?: string;
  valor?: string;
  completado?: boolean;
};

type InformeHallazgo = {
  id?: number | string;
  pregunta?: string;
  valor?: string;
};

type InformePublico = {
  token?: string;
  estado?: string;
  cliente_nombre?: string;
  servicio_descripcion?: string;
  resumen_ia?: string | null;
  taller_nombre?: string;
  vehiculo?: { patente?: string; marca?: string; modelo?: string; anio?: number | null };
  hallazgos?: InformeHallazgo[];
  fotos_evidencia?: InformeFoto[];
  firmas?: { tecnico?: string | null; supervisor?: string | null; cliente?: string | null };
  checklist?: { estado?: string; template_nombre?: string; items?: InformeItem[] };
  error?: string;
  message?: string;
};

function firmaDibujada(signature: string): boolean {
  const value = signature.trim();
  return value.startsWith('data:image/') && value.length > 120;
}

function texto(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function esImagen(value: unknown): value is string {
  const url = texto(value);
  return url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://');
}

export default function InformePublicoScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const insets = useSafeAreaInsets();
  const signatureRef = useRef<SignaturePadRef>(null);
  const [nombre, setNombre] = useState('');
  const [trazo, setTrazo] = useState(false);
  const [override, setOverride] = useState<InformePublico | null>(null);
  const [errorLocal, setErrorLocal] = useState('');
  const [firmando, setFirmando] = useState(false);

  const loaded = useQuery({
    queryKey: ['informe-publico', token],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const resp = await fetch(`${publicApiBase()}/checklists/informes/${encodeURIComponent(token)}/`, {
        headers: { Accept: 'application/json' },
      });
      const body = (await resp.json()) as InformePublico;
      if (!resp.ok && !body.estado) {
        throw new Error(body.error || 'No se pudo abrir el informe.');
      }
      return body;
    },
  });

  const doc = override ?? loaded.data ?? null;
  const cargando = Boolean(token) && loaded.isPending;
  const error = !token
    ? 'Falta el enlace del informe.'
    : errorLocal || (loaded.error instanceof Error ? loaded.error.message : '');
  const puedeFirmar = Boolean(doc && doc.estado !== 'FIRMADO' && doc.estado !== 'VEHICULO_RECLAMADO' && !doc.error);
  const listo = puedeFirmar && nombre.trim().length > 0 && trazo && !firmando;
  const items = doc?.checklist?.items ?? [];
  const hallazgos = doc?.hallazgos;
  const fotos = doc?.fotos_evidencia;
  const servicio = texto(doc?.servicio_descripcion);
  const resumen = texto(doc?.resumen_ia);
  const taller = texto(doc?.taller_nombre);

  const enviar = async (signature: string) => {
    if (!token) return;
    const limpio = nombre.trim();
    if (!limpio || !firmaDibujada(signature)) {
      setErrorLocal('Escribe tu nombre y dibuja la firma en el recuadro.');
      return;
    }
    setFirmando(true);
    setErrorLocal('');
    try {
      const resp = await fetch(`${publicApiBase()}/checklists/informes/${encodeURIComponent(token)}/firmar-cliente/`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ firma_cliente: signature, firmado_por_nombre: limpio }),
      });
      const body = (await resp.json()) as InformePublico;
      if (!resp.ok) {
        setErrorLocal(body.error || 'No se pudo registrar la firma.');
        return;
      }
      setOverride({
        ...(doc || {}),
        estado: body.estado || 'FIRMADO',
        message: body.message,
      });
    } catch {
      setErrorLocal('No se pudo registrar la firma.');
    } finally {
      setFirmando(false);
    }
  };

  const vehiculo = [doc?.vehiculo?.marca, doc?.vehiculo?.modelo, doc?.vehiculo?.anio, doc?.vehiculo?.patente]
    .filter((part) => part !== undefined && part !== null && String(part).trim() !== '')
    .join(' · ');

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <InstitutionalText role="caption" color="muted" testID="informe-publico-bearer">
          Quien tenga este enlace puede firmar el informe. Abrirlo no comprueba la identidad de la persona.
        </InstitutionalText>
        {cargando ? <ActivityIndicator color={I.primary} /> : null}
        {error ? (
          <InstitutionalText role="body" testID="informe-publico-error">{error}</InstitutionalText>
        ) : null}
        {doc ? (
          <View style={styles.card}>
            <InstitutionalText role="h3">Informe del servicio</InstitutionalText>
            {taller ? <InstitutionalText role="body">{taller}</InstitutionalText> : null}
            {doc.cliente_nombre ? (
              <InstitutionalText role="body" testID="informe-publico-cliente">{doc.cliente_nombre}</InstitutionalText>
            ) : null}
            {vehiculo ? (
              <InstitutionalText role="body" testID="informe-publico-vehiculo">{vehiculo}</InstitutionalText>
            ) : null}
            <InstitutionalText role="caption" testID="informe-publico-estado">{doc.estado || ''}</InstitutionalText>
            {servicio ? (
              <InstitutionalText role="body" testID="informe-publico-servicio">{servicio}</InstitutionalText>
            ) : null}
            {resumen ? (
              <InstitutionalText role="body" testID="informe-publico-resumen">{resumen}</InstitutionalText>
            ) : null}
            {doc.message ? <InstitutionalText role="body">{doc.message}</InstitutionalText> : null}
          </View>
        ) : null}
        {doc?.checklist ? (
          <View style={styles.card} testID="informe-publico-trabajo">
            <InstitutionalText role="h4">
              {texto(doc.checklist.template_nombre) || 'Checklist'}
            </InstitutionalText>
            {items.length === 0 ? (
              <InstitutionalText role="body" color="muted">Este checklist no trae respuestas.</InstitutionalText>
            ) : items.map((item, index) => {
              const pregunta = texto(item.pregunta_texto);
              const valor = texto(item.valor);
              return (
                <View key={String(item.id ?? index)} style={styles.row}>
                  {pregunta ? <InstitutionalText role="bodyBold">{pregunta}</InstitutionalText> : null}
                  <InstitutionalText role="body">{valor || 'Sin respuesta'}</InstitutionalText>
                </View>
              );
            })}
          </View>
        ) : null}
        {hallazgos ? (
          <View style={styles.card} testID="informe-publico-hallazgos">
            <InstitutionalText role="h4">Hallazgos</InstitutionalText>
            {hallazgos.length === 0 ? (
              <InstitutionalText role="body" color="muted">No hay hallazgos marcados.</InstitutionalText>
            ) : hallazgos.map((item, index) => (
              <View key={String(item.id ?? index)} style={styles.row}>
                {texto(item.pregunta) ? <InstitutionalText role="bodyBold">{texto(item.pregunta)}</InstitutionalText> : null}
                <InstitutionalText role="body">{texto(item.valor) || 'Sin valor'}</InstitutionalText>
              </View>
            ))}
          </View>
        ) : null}
        {fotos ? (
          <View style={styles.card} testID="informe-publico-fotos">
            <InstitutionalText role="h4">Evidencia</InstitutionalText>
            {fotos.length === 0 ? (
              <InstitutionalText role="body" color="muted">No hay fotos de evidencia.</InstitutionalText>
            ) : fotos.map((foto, index) => (
              esImagen(foto.imagen_url) ? (
                <Image
                  key={String(foto.id ?? index)}
                  source={{ uri: foto.imagen_url }}
                  accessibilityLabel={texto(foto.descripcion) || 'Foto de evidencia'}
                  style={styles.photo}
                  resizeMode="contain"
                />
              ) : (
                <InstitutionalText key={String(foto.id ?? index)} role="caption" color="muted">
                  {texto(foto.descripcion) || 'Foto sin archivo'}
                </InstitutionalText>
              )
            ))}
          </View>
        ) : null}
        {doc?.firmas ? (
          <View style={styles.card} testID="informe-publico-firmas">
            <InstitutionalText role="h4">Firmas registradas</InstitutionalText>
            <FirmaGuardada titulo="Técnico" valor={doc.firmas.tecnico} testID="informe-publico-firma-tecnico" />
            <FirmaGuardada titulo="Supervisor" valor={doc.firmas.supervisor} testID="informe-publico-firma-supervisor" />
            <FirmaGuardada titulo="Cliente" valor={doc.firmas.cliente} testID="informe-publico-firma-cliente" />
          </View>
        ) : null}
        {puedeFirmar ? (
          <View style={styles.actions}>
            <TextInput
              testID="informe-publico-nombre"
              accessibilityLabel="Nombre de quien firma"
              value={nombre}
              onChangeText={setNombre}
              placeholder="Tu nombre"
              placeholderTextColor={I.muted}
              style={styles.input}
            />
            <View
              accessibilityLabel="Zona de firma. Dibuja tu firma en el recuadro."
              testID="informe-publico-firma"
              style={styles.pad}
            >
              <SignaturePad
                ref={signatureRef}
                height={CANVAS_HEIGHT}
                onBegin={() => setTrazo(true)}
                onEmpty={() => setErrorLocal('La firma está vacía. Dibuja en el recuadro.')}
                onOK={(signature) => { void enviar(signature); }}
              />
            </View>
            <InstitutionalButton
              label={firmando ? 'Firmando…' : 'Firmar servicio'}
              onPress={() => signatureRef.current?.readSignature()}
              disabled={!listo}
              accessibilityLabel="Enviar la firma dibujada"
              testID="informe-publico-firmar"
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function FirmaGuardada({ titulo, valor, testID }: { titulo: string; valor?: string | null; testID: string }) {
  if (!esImagen(valor)) {
    return (
      <InstitutionalText role="body" color="muted" testID={testID}>
        {titulo}: sin firma
      </InstitutionalText>
    );
  }
  return (
    <View testID={testID} style={styles.row}>
      <InstitutionalText role="caption">{titulo}</InstitutionalText>
      <Image source={{ uri: valor }} accessibilityLabel={`Firma de ${titulo}`} style={styles.signature} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  content: {
    padding: SPACING.fixed.lg,
    gap: SPACING.fixed.md,
  },
  card: {
    gap: SPACING.fixed.sm,
    padding: SPACING.fixed.md,
    backgroundColor: I.paper,
    borderRadius: 16,
  },
  row: {
    gap: 2,
  },
  actions: {
    gap: SPACING.fixed.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: 12,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm,
    color: I.ink,
    backgroundColor: I.paper,
  },
  pad: {
    height: CANVAS_HEIGHT,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: I.paper,
  },
  photo: {
    width: '100%',
    height: 180,
    backgroundColor: I.canvas,
    borderRadius: 8,
  },
  signature: {
    width: '100%',
    height: 80,
    backgroundColor: I.canvas,
    borderRadius: 8,
  },
});
