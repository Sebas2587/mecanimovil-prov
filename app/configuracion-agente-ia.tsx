import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Bot, FileText, MessageSquare, RefreshCw, Trash2, Upload } from 'lucide-react-native';
import Header from '@/components/Header';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  HostPaperSection,
  HostSectionKicker,
  InstitutionalButton,
  InstitutionalTag,
  InstitutionalText,
  hostIconPlateStyle,
  hostScreenStyles,
  institutionalInputPlaceholder,
  institutionalInputStyles,
  institutionalSwitchProps,
} from '@/app/design-system/components';
import {
  AGENTE_IA_DOCUMENTOS_KEY,
  useActualizarAgenteConfigMutation,
  useAgenteIaConfigQuery,
  useAgenteIaDocumentosQuery,
  useReindexarAgenteConocimientoMutation,
} from '@/hooks/useAgenteIaQueries';
import agenteIaService, { type CanalAgente } from '@/services/agenteIaService';
import { useQueryClient } from '@tanstack/react-query';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

const CANALES: { key: CanalAgente; label: string; hint: string }[] = [
  { key: 'WHATSAPP', label: 'WhatsApp', hint: 'Respuestas en conversaciones Meta' },
  { key: 'MESSENGER', label: 'Facebook', hint: 'Messenger' },
  { key: 'INSTAGRAM', label: 'Instagram', hint: 'DM de Instagram' },
  { key: 'APP', label: 'Chat Mecanimovil', hint: 'Chats de la app' },
];

function estadoDocLabel(
  estado: string,
): { label: string; variant: 'success' | 'warning' | 'neutral' | 'error' } {
  switch (estado) {
    case 'listo':
      return { label: 'Indexado', variant: 'success' };
    case 'procesando':
      return { label: 'Procesando', variant: 'warning' };
    case 'error':
      return { label: 'Error', variant: 'error' };
    default:
      return { label: 'Pendiente', variant: 'neutral' };
  }
}

export default function ConfiguracionAgenteIaScreen() {
  const qc = useQueryClient();
  const { data: config, isLoading } = useAgenteIaConfigQuery();
  const { data: documentos = [], isLoading: loadingDocs } = useAgenteIaDocumentosQuery();
  const updateConfig = useActualizarAgenteConfigMutation();
  const reindexar = useReindexarAgenteConocimientoMutation();

  const [tituloDoc, setTituloDoc] = useState('');
  const [textoDoc, setTextoDoc] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [instrucciones, setInstrucciones] = useState('');
  const [bienvenida, setBienvenida] = useState('');

  useEffect(() => {
    if (config) {
      setInstrucciones(config.instrucciones_personalizadas || '');
      setBienvenida(config.mensaje_bienvenida || '');
    }
  }, [config?.actualizado_en, config?.instrucciones_personalizadas, config?.mensaje_bienvenida]);

  const toggleCanal = useCallback(
    (canal: CanalAgente) => {
      if (!config) return;
      const actuales = config.canales_habilitados?.length
        ? [...config.canales_habilitados]
        : CANALES.map((c) => c.key);
      const next = actuales.includes(canal)
        ? actuales.filter((c) => c !== canal)
        : [...actuales, canal];
      updateConfig.mutate({ canales_habilitados: next });
    },
    [config, updateConfig],
  );

  const canalActivo = useCallback(
    (canal: CanalAgente) => {
      if (!config?.canales_habilitados?.length) return true;
      return config.canales_habilitados.includes(canal);
    },
    [config],
  );

  const handleSubirDocumento = async () => {
    if (!tituloDoc.trim()) {
      Alert.alert('Falta título', 'Indica un nombre para el documento.');
      return;
    }
    setSubiendo(true);
    try {
      await agenteIaService.crearDocumento({
        titulo: tituloDoc.trim(),
        texto_pegado: textoDoc,
      });
      setTituloDoc('');
      setTextoDoc('');
      qc.invalidateQueries({ queryKey: AGENTE_IA_DOCUMENTOS_KEY });
    } catch {
      Alert.alert('Error', 'No se pudo guardar el documento.');
    } finally {
      setSubiendo(false);
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const titulo = tituloDoc.trim() || asset.name || 'Documento';
      setSubiendo(true);
      await agenteIaService.crearDocumento({
        titulo,
        archivo: {
          uri: asset.uri,
          name: asset.name || 'documento.pdf',
          type: asset.mimeType || 'application/pdf',
        },
      });
      setTituloDoc('');
      qc.invalidateQueries({ queryKey: AGENTE_IA_DOCUMENTOS_KEY });
    } catch {
      Alert.alert('Error', 'No se pudo subir el archivo.');
    } finally {
      setSubiendo(false);
    }
  };

  const handleReindexar = async () => {
    try {
      const res = await reindexar.mutateAsync();
      Alert.alert(
        'Reindexando conocimiento',
        `Se están actualizando ${res.ofertas} servicio(s), ${res.solicitudes} trabajo(s) del historial y ${res.documentos} documento(s). ` +
          'La IA usará este contexto en las próximas respuestas (puede tardar uno o dos minutos).',
      );
    } catch {
      Alert.alert('Error', 'No se pudo reindexar el conocimiento del taller.');
    }
  };

  const handleEliminar = (id: number, titulo: string) => {
    const run = async () => {
      try {
        await agenteIaService.eliminarDocumento(id);
        qc.invalidateQueries({ queryKey: AGENTE_IA_DOCUMENTOS_KEY });
      } catch {
        Alert.alert('Error', 'No se pudo eliminar el documento.');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`¿Eliminar "${titulo}"?`)) void run();
      return;
    }
    Alert.alert('Eliminar documento', `¿Eliminar "${titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void run() },
    ]);
  };

  if (isLoading || !config) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="Agente IA" showBack onBackPress={() => router.back()} />
        <View style={styles.loader}>
          <ActivityIndicator color={I.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Agente IA" showBack onBackPress={() => router.back()} />
      <ScrollView
        style={hostScreenStyles.scroll}
        contentContainerStyle={[hostScreenStyles.scrollInner, styles.scrollInner]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <HostSectionKicker label="Estado" />
        <HostPaperSection style={styles.section}>
          <View style={styles.statusRow}>
            <View style={hostIconPlateStyle}>
              <Bot size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <View style={styles.flex}>
              <View style={styles.statusTitleRow}>
                <InstitutionalText role="body" style={styles.title}>
                  Respuestas automáticas
                </InstitutionalText>
                <InstitutionalTag
                  label={
                    config.agente_ia_disponible_en_plan === false
                      ? 'No incluido en tu plan'
                      : config.habilitado
                        ? 'Activo'
                        : 'Apagado'
                  }
                  variant={
                    config.agente_ia_disponible_en_plan === false
                      ? 'neutral'
                      : config.habilitado
                        ? 'primary'
                        : 'neutral'
                  }
                  size="sm"
                />
              </View>
              <InstitutionalText role="caption" color="muted">
                {config.agente_ia_disponible_en_plan === false
                  ? 'El Agente IA está disponible desde el Plan Profesional. Sube de plan para activar la auto-respuesta.'
                  : 'Se activa chat por chat (como ManyChat): no basta con esta pantalla. En cada conversación usa el botón Agente IA. Aquí configuras canales, tono e información del taller.'}
              </InstitutionalText>
            </View>
          </View>
        </HostPaperSection>

        <HostSectionKicker label="Canales activos" />
        <HostPaperSection style={styles.section}>
          {CANALES.map((c, index) => (
            <Pressable
              key={c.key}
              style={[styles.canalRow, index > 0 && styles.canalRowBorder]}
              onPress={() => toggleCanal(c.key)}
            >
              <View style={styles.canalLeft}>
                <View style={hostIconPlateStyle}>
                  <MessageSquare size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                </View>
                <View style={styles.flex}>
                  <InstitutionalText role="body" style={styles.canalLabel}>
                    {c.label}
                  </InstitutionalText>
                  <InstitutionalText role="caption" color="muted">
                    {c.hint}
                  </InstitutionalText>
                </View>
              </View>
              <Switch
                value={canalActivo(c.key)}
                onValueChange={() => toggleCanal(c.key)}
                {...institutionalSwitchProps}
              />
            </Pressable>
          ))}
        </HostPaperSection>

        <HostSectionKicker label="Instrucciones para la IA" />
        <HostPaperSection style={styles.section}>
          <View style={institutionalInputStyles.field}>
            <InstitutionalText role="caption" color="muted" style={institutionalInputStyles.hint}>
              Cómo debe hablar con tus clientes, qué preguntar primero, políticas del taller.
            </InstitutionalText>
            <TextInput
              style={[institutionalInputStyles.input, institutionalInputStyles.inputMultiline, styles.textAreaTall]}
              multiline
              value={instrucciones}
              onChangeText={setInstrucciones}
              placeholder="Ej: Siempre pide patente. No confirmes precios finales..."
              placeholderTextColor={institutionalInputPlaceholder}
            />
          </View>
          <View style={institutionalInputStyles.field}>
            <InstitutionalText role="caption" color="muted" style={institutionalInputStyles.hint}>
              Mensaje de bienvenida (opcional)
            </InstitutionalText>
            <TextInput
              style={[institutionalInputStyles.input, institutionalInputStyles.inputMultiline]}
              multiline
              value={bienvenida}
              onChangeText={setBienvenida}
              placeholder="Hola, soy el asistente del taller..."
              placeholderTextColor={institutionalInputPlaceholder}
            />
          </View>
          <InstitutionalButton
            label="Guardar instrucciones"
            variant="primary"
            size="compact"
            onPress={() =>
              updateConfig.mutate({
                instrucciones_personalizadas: instrucciones,
                mensaje_bienvenida: bienvenida,
              })
            }
            disabled={updateConfig.isPending}
            style={styles.stretchBtn}
          />
        </HostPaperSection>

        <HostSectionKicker label="Conocimiento del taller" />
        <HostPaperSection style={styles.section}>
          <InstitutionalText role="caption" color="muted">
            Tu catálogo e historial se indexan solos al crearlos. Agrega manuales, listas de
            precios o políticas en texto o PDF. Si la IA responde de forma genérica o sin
            mencionar tus servicios reales, reindexa el conocimiento manualmente.
          </InstitutionalText>
          <InstitutionalButton
            label={reindexar.isPending ? 'Reindexando…' : 'Reindexar conocimiento'}
            variant="outline"
            size="compact"
            leading={<RefreshCw size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
            onPress={() => void handleReindexar()}
            disabled={reindexar.isPending}
            style={styles.stretchBtn}
          />
          <TextInput
            style={institutionalInputStyles.input}
            value={tituloDoc}
            onChangeText={setTituloDoc}
            placeholder="Título del documento"
            placeholderTextColor={institutionalInputPlaceholder}
          />
          <TextInput
            style={[institutionalInputStyles.input, institutionalInputStyles.inputMultiline, styles.textAreaTall]}
            multiline
            value={textoDoc}
            onChangeText={setTextoDoc}
            placeholder="Pega texto aquí (opcional si subes archivo)"
            placeholderTextColor={institutionalInputPlaceholder}
          />
          <View style={styles.docActions}>
            <InstitutionalButton
              label={subiendo ? 'Guardando…' : 'Guardar texto'}
              variant="primary"
              size="compact"
              onPress={() => void handleSubirDocumento()}
              disabled={subiendo}
              style={styles.docBtn}
            />
            <InstitutionalButton
              label="Subir PDF"
              variant="outline"
              size="compact"
              leading={<Upload size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />}
              onPress={() => void handlePickFile()}
              disabled={subiendo}
              style={styles.docBtn}
            />
          </View>

          {loadingDocs ? (
            <ActivityIndicator color={I.primary} style={styles.docLoader} />
          ) : documentos.length === 0 ? (
            <View style={styles.emptyDocs}>
              <InstitutionalText role="caption" color="muted" style={styles.emptyDocsText}>
                Aún no hay documentos. Sube un PDF o pega texto para enriquecer las respuestas.
              </InstitutionalText>
            </View>
          ) : (
            documentos.map((doc, index) => {
              const est = estadoDocLabel(doc.estado_procesamiento);
              return (
                <View key={doc.id} style={[styles.docRow, index === 0 && styles.docRowFirst]}>
                  <View style={[hostIconPlateStyle, styles.docIcon]}>
                    <FileText size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                  </View>
                  <View style={styles.flex}>
                    <InstitutionalText role="body" numberOfLines={1} style={styles.docTitle}>
                      {doc.titulo}
                    </InstitutionalText>
                    <InstitutionalTag label={est.label} variant={est.variant} size="sm" />
                    {doc.error_detalle ? (
                      <InstitutionalText role="caption" color="body" numberOfLines={2}>
                        {doc.error_detalle}
                      </InstitutionalText>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => handleEliminar(doc.id, doc.titulo)}
                    hitSlop={8}
                    accessibilityLabel={`Eliminar ${doc.titulo}`}
                  >
                    <Trash2 size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                  </Pressable>
                </View>
              );
            })
          )}
        </HostPaperSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  scrollInner: {
    paddingBottom: SPACING.fixed.xl * 2,
    gap: SPACING.fixed.sm,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: SPACING.fixed.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
    marginBottom: 4,
  },
  flex: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontFamily: FF.sansSemiBold,
  },
  canalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.sm,
  },
  canalRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  canalLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    minWidth: 0,
  },
  canalLabel: {
    fontFamily: FF.sansMedium,
  },
  textAreaTall: {
    minHeight: 120,
  },
  stretchBtn: {
    alignSelf: 'stretch',
  },
  docActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
  },
  docBtn: {
    flexGrow: 1,
  },
  docLoader: {
    marginTop: SPACING.fixed.sm,
  },
  emptyDocs: {
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  emptyDocsText: {
    textAlign: 'center',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  docRowFirst: {
    marginTop: SPACING.fixed.xs,
  },
  docIcon: {
    width: 32,
    height: 32,
  },
  docTitle: {
    fontFamily: FF.sansMedium,
  },
});
