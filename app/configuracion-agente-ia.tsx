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
import { Bot, FileText, Trash2 } from 'lucide-react-native';
import Header from '@/components/Header';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  HostPaperSection,
  HostSectionKicker,
  InstitutionalButton,
  InstitutionalTag,
  InstitutionalText,
  hostIconPlateStyle,
  hostScreenStyles,
} from '@/app/design-system/components';
import {
  useActualizarAgenteConfigMutation,
  useAgenteIaConfigQuery,
  useAgenteIaDocumentosQuery,
} from '@/hooks/useAgenteIaQueries';
import agenteIaService, { type CanalAgente } from '@/services/agenteIaService';
import { useQueryClient } from '@tanstack/react-query';
import { AGENTE_IA_DOCUMENTOS_KEY } from '@/hooks/useAgenteIaQueries';

const I = COLORS.institutional;

const CANALES: { key: CanalAgente; label: string }[] = [
  { key: 'WHATSAPP', label: 'WhatsApp' },
  { key: 'MESSENGER', label: 'Facebook' },
  { key: 'INSTAGRAM', label: 'Instagram' },
  { key: 'APP', label: 'Chat Mecanimovil' },
];

function estadoDocLabel(estado: string): { label: string; variant: 'success' | 'warning' | 'neutral' | 'error' } {
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
      <SafeAreaView style={hostScreenStyles.safeArea} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="Agente IA" showBack onBackPress={() => router.back()} />
        <View style={styles.loader}>
          <ActivityIndicator color={I.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={hostScreenStyles.safeArea} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Agente IA" showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <HostSectionKicker label="Asistente automático" />
        <HostPaperSection style={styles.section}>
          <View style={styles.rowHeader}>
            <View style={[hostIconPlateStyle, styles.iconPlate]}>
              <Bot size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <View style={styles.flex}>
              <InstitutionalText role="body" style={styles.title}>
                Responder chats automáticamente
              </InstitutionalText>
              <InstitutionalText role="caption" color="muted">
                Captura datos del cliente, consulta tu catálogo e historial, y prepara cotizaciones para que las revises.
              </InstitutionalText>
            </View>
            <Switch
              value={config.habilitado}
              onValueChange={(v) => updateConfig.mutate({ habilitado: v })}
              trackColor={{ false: I.hairline, true: I.primary }}
            />
          </View>
        </HostPaperSection>

        <HostSectionKicker label="Canales activos" />
        <HostPaperSection style={styles.section}>
          {CANALES.map((c) => (
            <Pressable key={c.key} style={styles.canalRow} onPress={() => toggleCanal(c.key)}>
              <InstitutionalText role="body">{c.label}</InstitutionalText>
              <Switch
                value={canalActivo(c.key)}
                onValueChange={() => toggleCanal(c.key)}
                trackColor={{ false: I.hairline, true: I.primary }}
              />
            </Pressable>
          ))}
        </HostPaperSection>

        <HostSectionKicker label="Instrucciones para la IA" />
        <HostPaperSection style={styles.section}>
          <InstitutionalText role="caption" color="muted" style={styles.fieldHint}>
            Cómo debe hablar con tus clientes, qué preguntar primero, políticas del taller, etc.
          </InstitutionalText>
          <TextInput
            style={styles.textArea}
            multiline
            value={instrucciones}
            onChangeText={setInstrucciones}
            placeholder="Ej: Siempre pide patente. No confirmes precios finales..."
            placeholderTextColor={I.muted}
          />
          <InstitutionalText role="caption" color="muted" style={styles.fieldHint}>
            Mensaje de bienvenida (opcional)
          </InstitutionalText>
          <TextInput
            style={styles.textAreaShort}
            multiline
            value={bienvenida}
            onChangeText={setBienvenida}
            placeholder="Hola, soy el asistente del taller..."
            placeholderTextColor={I.muted}
          />
          <InstitutionalButton
            label="Guardar instrucciones"
            variant="outline"
            size="compact"
            onPress={() =>
              updateConfig.mutate({
                instrucciones_personalizadas: instrucciones,
                mensaje_bienvenida: bienvenida,
              })
            }
            disabled={updateConfig.isPending}
          />
        </HostPaperSection>

        <HostSectionKicker label="Conocimiento del taller" />
        <HostPaperSection style={styles.section}>
          <InstitutionalText role="caption" color="muted" style={styles.fieldHint}>
            Tu catálogo e historial se indexan solos. Aquí puedes agregar manuales, listas de precios o políticas en texto/PDF.
          </InstitutionalText>
          <TextInput
            style={styles.input}
            value={tituloDoc}
            onChangeText={setTituloDoc}
            placeholder="Título del documento"
            placeholderTextColor={I.muted}
          />
          <TextInput
            style={styles.textArea}
            multiline
            value={textoDoc}
            onChangeText={setTextoDoc}
            placeholder="Pega texto aquí (opcional si subes archivo)"
            placeholderTextColor={I.muted}
          />
          <View style={styles.docActions}>
            <InstitutionalButton
              label={subiendo ? 'Guardando…' : 'Guardar texto'}
              variant="primary"
              size="compact"
              onPress={() => void handleSubirDocumento()}
              disabled={subiendo}
            />
            <InstitutionalButton
              label="Subir PDF"
              variant="outline"
              size="compact"
              onPress={() => void handlePickFile()}
              disabled={subiendo}
            />
          </View>

          {loadingDocs ? (
            <ActivityIndicator color={I.primary} style={styles.docLoader} />
          ) : (
            documentos.map((doc) => {
              const est = estadoDocLabel(doc.estado_procesamiento);
              return (
                <View key={doc.id} style={styles.docRow}>
                  <View style={[hostIconPlateStyle, styles.docIcon]}>
                    <FileText size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                  </View>
                  <View style={styles.flex}>
                    <InstitutionalText role="body" numberOfLines={1}>
                      {doc.titulo}
                    </InstitutionalText>
                    <InstitutionalTag label={est.label} variant={est.variant} size="sm" />
                    {doc.error_detalle ? (
                      <InstitutionalText role="caption" color="body" numberOfLines={2}>
                        {doc.error_detalle}
                      </InstitutionalText>
                    ) : null}
                  </View>
                  <Pressable onPress={() => handleEliminar(doc.id, doc.titulo)} hitSlop={8}>
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
  scroll: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
    gap: SPACING.sm,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: SPACING.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  iconPlate: {
    marginTop: 2,
  },
  flex: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
  },
  canalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  fieldHint: {
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
    backgroundColor: I.canvas,
  },
  textArea: {
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.sm,
    minHeight: 100,
    textAlignVertical: 'top',
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
    backgroundColor: I.canvas,
  },
  textAreaShort: {
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.sm,
    minHeight: 64,
    textAlignVertical: 'top',
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
    backgroundColor: I.canvas,
  },
  docActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  docLoader: {
    marginTop: SPACING.sm,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  docIcon: {
    width: 32,
    height: 32,
  },
});
