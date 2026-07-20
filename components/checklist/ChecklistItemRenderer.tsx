import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  ChecklistItemTemplate,
  ChecklistItemResponse,
  ChecklistInstance,
  ChecklistSaludSnapshotItem,
} from '@/services/checklistService';
import { ChecklistSignatureModal, type SignatureMode } from './ChecklistSignatureModal';
import { InventoryChecklistComponent } from './items/InventoryChecklistComponent';
import { FuelGaugeComponent } from './items/FuelGaugeComponent';
import {
  checklistService,
  getDisplayNameForCategoria,
  getDisplayNameForTipoPregunta
} from '@/services/checklistService';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { showAlert, showConfirm } from '@/utils/platformAlert';
import { useOrdenSignatureDisplay } from '@/hooks/useOrdenSignatureDisplay';
import { InstitutionalButton } from '@/design-system/components/InstitutionalButton';
import {
  checklistItemStyles as styles,
  saludStyles,
  sliderStyles,
  SALUD_NIVEL_COLORS,
  SALUD_NIVEL_LABEL,
  I,
} from '@/components/checklist/checklistItemStyles';

interface ChecklistItemRendererProps {
  item: ChecklistItemTemplate;
  response?: ChecklistItemResponse | null;
  onSave: (responseData: any, options?: { silent?: boolean }) => Promise<any>;
  saving: boolean;
  instance: ChecklistInstance;
  finalizeChecklist: (data: any) => Promise<any>;
  takePicture?: () => Promise<any>;
  pickFromGallery?: () => Promise<any>;
  uploadPhoto?: (
    photoUri: string,
    responseId: number,
    ordenEnRespuesta: number,
    descripcion?: string
  ) => Promise<any>;
  deletePhoto?: (photoId: number) => Promise<any>;
  /** Snapshot de salud actual del componente vinculado (refactor 2026). */
  saludSnapshot?: ChecklistSaludSnapshotItem | null;
  /** Kilometraje actual del vehículo (root del snapshot de salud). */
  kmActual?: number | null;
  /** Oculta el header interno cuando la pantalla padre ya muestra el título. */
  hideHeader?: boolean;
}

function nivelDesdePct(pct: number): keyof typeof SALUD_NIVEL_COLORS {
  if (pct >= 80) return 'OPTIMO';
  if (pct >= 60) return 'ATENCION';
  if (pct >= 35) return 'URGENTE';
  return 'CRITICO';
}

function diasDesde(iso?: string | null): string | null {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  const dias = Math.floor((Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24));
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  if (dias < 365) return `hace ${Math.round(dias / 30)} meses`;
  return `hace ${Math.round(dias / 365)} años`;
}

interface SaludActualBannerProps {
  snapshot: ChecklistSaludSnapshotItem;
}

const SaludActualBanner: React.FC<SaludActualBannerProps> = ({ snapshot }) => {
  const tieneDato = snapshot.salud_actual !== null;
  const pct = snapshot.salud_actual ?? 0;
  const nivel = snapshot.nivel_alerta_actual ?? (tieneDato ? nivelDesdePct(pct) : null);
  const color = nivel ? SALUD_NIVEL_COLORS[nivel] : I.mutedSoft;
  const label = nivel ? SALUD_NIVEL_LABEL[nivel] : 'Sin datos';
  const cuando = diasDesde(snapshot.fecha_ultimo_servicio);
  const intencionLabel =
    snapshot.tipo_actualizacion === 'REEMPLAZA' ? 'Será reemplazado'
    : snapshot.tipo_actualizacion === 'INSPECCIONA' ? 'Solo inspección'
    : 'Sin impacto en salud';

  return (
    <View style={saludStyles.container}>
      <View style={saludStyles.headerRow}>
        <View style={saludStyles.iconWrap}>
          <InstitutionalIcon
            name="favorite"
            size={16}
            color={color}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={saludStyles.title}>{snapshot.componente.nombre}</Text>
          <Text style={saludStyles.intencionTag}>{intencionLabel}</Text>
        </View>
        {tieneDato && (
          <View style={[saludStyles.badge, { backgroundColor: color }]}>
            <Text style={saludStyles.badgeText}>{Math.round(pct)}%</Text>
          </View>
        )}
        {!tieneDato && (
          <View style={[saludStyles.badge, { backgroundColor: I.mutedSoft }]}>
            <Text style={saludStyles.badgeText}>S/D</Text>
          </View>
        )}
      </View>
      <View style={saludStyles.barTrack}>
        <View
          style={[
            saludStyles.barFill,
            {
              width: `${Math.min(100, Math.max(0, pct))}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <View style={saludStyles.metaRow}>
        <Text style={saludStyles.metaText}>{label}</Text>
        {cuando && (
          <Text style={saludStyles.metaText}>· Última actualización {cuando}</Text>
        )}
      </View>
    </View>
  );
};

// ── Slider COMPONENT_HEALTH (sin dependencias nuevas) ───────────────────────
interface ComponentHealthSliderProps {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

const PRESET_VALUES = [0, 25, 50, 75, 100];

const ComponentHealthSlider: React.FC<ComponentHealthSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
}) => {
  const current = value ?? 0;
  const nivel = nivelDesdePct(current);
  const color = SALUD_NIVEL_COLORS[nivel];
  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.valueRow}>
        <Text style={[sliderStyles.valueText, { color }]}>
          {value === null ? '—' : `${Math.round(current)}%`}
        </Text>
        <Text style={[sliderStyles.nivelText, { color }]}>
          {SALUD_NIVEL_LABEL[nivel]}
        </Text>
      </View>

      <View style={sliderStyles.barTrack}>
        <View
          style={[
            sliderStyles.barFill,
            {
              width: `${Math.min(100, Math.max(0, current))}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>

      <View style={sliderStyles.stepRow}>
        <TouchableOpacity
          style={sliderStyles.stepButton}
          onPress={() => onChange(clamp(current - 5))}
          accessibilityRole="button"
          accessibilityLabel="Disminuir 5%"
        >
          <Text style={sliderStyles.stepButtonText}>−5</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={sliderStyles.stepButton}
          onPress={() => onChange(clamp(current - 1))}
          accessibilityRole="button"
          accessibilityLabel="Disminuir 1%"
        >
          <Text style={sliderStyles.stepButtonText}>−1</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={sliderStyles.stepButton}
          onPress={() => onChange(clamp(current + 1))}
          accessibilityRole="button"
          accessibilityLabel="Aumentar 1%"
        >
          <Text style={sliderStyles.stepButtonText}>+1</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={sliderStyles.stepButton}
          onPress={() => onChange(clamp(current + 5))}
          accessibilityRole="button"
          accessibilityLabel="Aumentar 5%"
        >
          <Text style={sliderStyles.stepButtonText}>+5</Text>
        </TouchableOpacity>
      </View>

      <View style={sliderStyles.presetRow}>
        {PRESET_VALUES.map((preset) => {
          const active = Math.round(current) === preset;
          return (
            <TouchableOpacity
              key={preset}
              style={[
                sliderStyles.presetButton,
                active && {
                  borderColor: color,
                  backgroundColor: I.surfaceStrong,
                },
              ]}
              onPress={() => onChange(preset)}
              accessibilityRole="button"
              accessibilityLabel={`Vida útil ${preset}%`}
            >
              <Text
                style={[
                  sliderStyles.presetText,
                  active && { color, fontWeight: '700' },
                ]}
              >
                {preset}%
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export const ChecklistItemRenderer: React.FC<ChecklistItemRendererProps> = ({
  item,
  response,
  onSave,
  saving,
  instance,
  finalizeChecklist,
  takePicture,
  pickFromGallery,
  uploadPhoto,
  deletePhoto,
  saludSnapshot,
  kmActual,
  hideHeader = false,
}) => {
  const [inputValue, setInputValue] = useState<any>('');
  const [isModified, setIsModified] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Estado para el flujo de fotos con descripción
  const [pendingPhotoData, setPendingPhotoData] = useState<any>(null);
  const [photoDescriptionInput, setPhotoDescriptionInput] = useState('');
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);

  // Almacenar fotos localmente por response.id para que no se pierdan
  // al salir y volver a entrar al item (offline-first).
  useEffect(() => {
    const hydrateOfflinePhotos = async () => {
      if (item.tipo_pregunta !== 'PHOTO') return;
      if (!response?.id) return;

      try {
        const serverPhotos = Array.isArray(response.fotos) ? response.fotos : [];
        const offlinePhotos = await checklistService.getOfflinePhotosByResponse(response.id);

        // Merge sin duplicar: server.id contra offline.server_id
        const serverIds = new Set(serverPhotos.map((p: any) => p?.id).filter(Boolean));
        const mergedOffline = offlinePhotos.filter((p: any) => !p.server_id || !serverIds.has(p.server_id));

        const merged = [
          ...serverPhotos,
          ...mergedOffline.map((p: any) => ({
            local_id: p.local_id,
            uri: p.uri,
            imagen_url: p.imagen_url || p.uri,
            descripcion: p.descripcion,
            orden_en_respuesta: p.orden_en_respuesta,
            id: p.server_id, // si existe, lo tratamos como sincronizado
          })),
        ].sort((a: any, b: any) => (a.orden_en_respuesta || 0) - (b.orden_en_respuesta || 0));

        setPhotos(merged);
      } catch (e) {
        console.warn('⚠️ No se pudieron hidratar fotos offline:', e);
      }
    };

    hydrateOfflinePhotos();
  }, [item.tipo_pregunta, response?.id, response?.fotos]);

  // Inicializar valor desde la respuesta existente
  useEffect(() => {
    console.log('🔄 Inicializando ChecklistItemRenderer para item:', item.id, 'con respuesta:', response);

    if (response) {
      console.log('📝 Cargando respuesta existente:', {
        texto: response.respuesta_texto,
        numero: response.respuesta_numero,
        booleana: response.respuesta_booleana,
        seleccion: response.respuesta_seleccion,
        tipo: item.tipo_pregunta,
        fotos: response.fotos?.length || 0
      });

      // Cargar valor según el tipo de pregunta
      switch (item.tipo_pregunta) {
        case 'TEXT':
        case 'FINAL_NOTES':
        case 'WORK_SUMMARY':
        case 'DAMAGE_REPORT':
          if (response.respuesta_texto !== null && response.respuesta_texto !== undefined) {
            setInputValue(response.respuesta_texto);
            console.log('✅ Valor texto cargado:', response.respuesta_texto);
          }
          break;

        case 'NUMBER':
        case 'KILOMETER_INPUT':
          if (response.respuesta_numero !== null && response.respuesta_numero !== undefined) {
            setInputValue(response.respuesta_numero.toString());
            console.log('✅ Valor número cargado:', response.respuesta_numero);
          }
          break;

        case 'COMPONENT_HEALTH':
          if (response.respuesta_numero !== null && response.respuesta_numero !== undefined) {
            setInputValue(Number(response.respuesta_numero));
            console.log('✅ Vida útil cargada:', response.respuesta_numero);
          }
          break;

        case 'BOOLEAN':
        case 'CLIENT_CONFIRMATION':
          if (response.respuesta_booleana !== null && response.respuesta_booleana !== undefined) {
            setInputValue(response.respuesta_booleana);
            console.log('✅ Valor booleano cargado:', response.respuesta_booleana);
          }
          break;

        case 'SELECT':
        case 'MULTISELECT':
        case 'SERVICE_SELECTION':
        case 'VEHICLE_CONDITION':
        case 'ELECTRICAL_CHECK':
        case 'BRAKE_CHECK':
        case 'SUSPENSION_CHECK':
        case 'TIRE_CONDITION':
        case 'EXTERIOR_INSPECTION':
        case 'INTERIOR_INSPECTION':
        case 'ENGINE_INSPECTION':
        case 'FLUID_LEVEL':
          if (response.respuesta_seleccion !== null && response.respuesta_seleccion !== undefined) {
            setInputValue(response.respuesta_seleccion);
            console.log('✅ Valor selección cargado:', response.respuesta_seleccion);
          }
          break;

        case 'PHOTO':
          // Sincronizar con el servidor SOLO cuando haya fotos persistidas.
          // Esto evita borrar las fotos recién capturadas localmente mientras
          // todavía no se ha recargado la instancia completa desde la API.
          if (Array.isArray(response.fotos) && response.fotos.length > 0) {
            setPhotos(response.fotos);
            console.log('✅ Fotos sincronizadas desde servidor:', response.fotos.length);
          }
          break;

        case 'DATETIME':
          if (response.respuesta_fecha) {
            setInputValue(response.respuesta_fecha);
            console.log('✅ Fecha cargada:', response.respuesta_fecha);
          }
          break;

        case 'RATING':
          if (response.respuesta_numero !== null && response.respuesta_numero !== undefined) {
            setInputValue(response.respuesta_numero);
            console.log('✅ Rating cargado:', response.respuesta_numero);
          }
          break;
      }
    } else {
      console.log('🆕 No hay respuesta previa, inicializando valores por defecto');
      switch (item.tipo_pregunta) {
        case 'BOOLEAN':
        case 'CLIENT_CONFIRMATION':
          setInputValue(null);
          break;
        case 'NUMBER':
        case 'KILOMETER_INPUT':
        case 'RATING':
          setInputValue('');
          break;
        case 'MULTISELECT':
        case 'SERVICE_SELECTION':
        case 'VEHICLE_CONDITION':
        case 'ELECTRICAL_CHECK':
        case 'BRAKE_CHECK':
        case 'SUSPENSION_CHECK':
        case 'TIRE_CONDITION':
        case 'EXTERIOR_INSPECTION':
        case 'INTERIOR_INSPECTION':
        case 'ENGINE_INSPECTION':
        case 'FLUID_LEVEL':
          setInputValue([]);
          break;
        case 'PHOTO':
          // Sin respuesta previa → sin fotos
          setPhotos([]);
          break;
        default:
          setInputValue('');
      }
    }
  }, [response, item]);

  const proceedSave = async (responseData: Record<string, unknown>) => {
    await onSave(responseData);
    setIsModified(false);
  };

  // Función para guardar la respuesta
  const handleSave = async () => {
    let responseData: Record<string, unknown> = {};

    switch (item.tipo_pregunta) {
      case 'TEXT':
      case 'DAMAGE_REPORT':
      case 'FINAL_NOTES':
      case 'WORK_SUMMARY':
        responseData.respuesta_texto = inputValue;
        break;
      case 'NUMBER':
      case 'KILOMETER_INPUT':
      case 'RATING': {
        const rawStr = String(inputValue ?? '')
          .trim()
          .replace(/\s/g, '')
          .replace(/,/g, '.');
        const n = parseFloat(rawStr);
        if (item.tipo_pregunta === 'KILOMETER_INPUT' || item.tipo_pregunta === 'NUMBER') {
          responseData.respuesta_numero = Number.isFinite(n) ? n : null;
        } else {
          responseData.respuesta_numero = Number.isFinite(n) ? n : 0;
        }
        break;
      }
      case 'COMPONENT_HEALTH': {
        const n = typeof inputValue === 'number' ? inputValue : Number(inputValue);
        responseData.respuesta_numero = Number.isFinite(n)
          ? Math.max(0, Math.min(100, n))
          : null;
        break;
      }
      case 'BOOLEAN':
      case 'CLIENT_CONFIRMATION':
        responseData.respuesta_booleana = inputValue;
        break;
      case 'SELECT':
      case 'MULTISELECT':
      case 'FLUID_LEVEL':
      case 'SERVICE_SELECTION':
      case 'VEHICLE_CONDITION':
      case 'ELECTRICAL_CHECK':
      case 'BRAKE_CHECK':
      case 'SUSPENSION_CHECK':
      case 'TIRE_CONDITION':
      case 'EXTERIOR_INSPECTION':
      case 'INTERIOR_INSPECTION':
      case 'ENGINE_INSPECTION':
        responseData.respuesta_seleccion = inputValue;
        break;
      case 'FUEL_GAUGE':
      case 'INVENTORY_CHECKLIST':
        if (
          inputValue &&
          typeof inputValue === 'object' &&
          !Array.isArray(inputValue) &&
          ('respuesta_seleccion' in inputValue ||
            'respuesta_texto' in inputValue ||
            'respuesta_numero' in inputValue)
        ) {
          Object.assign(responseData, inputValue);
        } else {
          responseData.respuesta_seleccion = inputValue;
        }
        break;
      case 'DATETIME':
        responseData.respuesta_fecha = inputValue;
        break;
      case 'LOCATION':
        responseData.respuesta_ubicacion = inputValue;
        break;
      case 'PHOTO':
        // Para fotos, solo marcamos como completado si hay fotos
        responseData.completado = photos.length > 0;
        break;
    }

    if (item.tipo_pregunta === 'KILOMETER_INPUT') {
      const n = responseData.respuesta_numero as number | null | undefined;
      if (Number.isFinite(n)) {
        if (kmActual != null && n! < kmActual) {
          showAlert(
            'Kilometraje inválido',
            `El km ingresado (${n!.toLocaleString()}) es menor al registrado en el vehículo (${kmActual.toLocaleString()} km). Verifica el valor.`,
          );
          return;
        }
        if (kmActual != null && n === kmActual) {
          showConfirm(
            'Mismo kilometraje',
            `El km ingresado es igual al actual (${kmActual.toLocaleString()} km). ¿Deseas continuar?`,
            { confirmText: 'Continuar', onConfirm: () => proceedSave(responseData) },
          );
          return;
        }
      }
    }

    await proceedSave(responseData);
  };

  // Manejar cambios en el input
  const handleInputChange = (value: any) => {
    setInputValue(value);
    setIsModified(true);
  };

  // Función para tomar foto
  const handleTakePicture = async () => {
    if (!takePicture) {
      Alert.alert('Error', 'Función de cámara no disponible');
      return;
    }
    const result = await takePicture();
    if (result.success && result.data) {
      const defaultDesc = `Foto ${photos.length + 1}`;
      setPendingPhotoData(result.data);
      setPhotoDescriptionInput(defaultDesc);
      setShowDescriptionModal(true);
    }
  };

  // Función para seleccionar de galería
  const handlePickFromGallery = async () => {
    if (!pickFromGallery) {
      Alert.alert('Error', 'Función de galería no disponible');
      return;
    }
    const result = await pickFromGallery();
    if (result.success && result.data) {
      const defaultDesc = `Foto ${photos.length + 1}`;
      setPendingPhotoData(result.data);
      setPhotoDescriptionInput(defaultDesc);
      setShowDescriptionModal(true);
    }
  };

  // Confirmación: agregar foto en local (sin subir aún). El mecánico decide cuántas
  // tomar; al pulsar "Guardar y continuar" se suben todas juntas.
  const handlePhotoSubmit = async () => {
    if (!pendingPhotoData) return;

    setShowDescriptionModal(false);

    const descripcion = photoDescriptionInput.trim() || `Foto ${photos.length + 1}`;
    const nextOrder = photos.length + 1;
    const localId = `photo_${response?.id || 'tmp'}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    try {
      let responseId = response?.id;
      if (!responseId) {
        const saveResult = await onSave({ completado: false }, { silent: true });
        responseId = saveResult?.data?.id;
        if (!responseId) {
          Alert.alert('Error', 'No se pudo registrar la respuesta del item. Intenta de nuevo.');
          return;
        }
      }

      const newPhoto = {
        local_id: localId,
        uri: pendingPhotoData.uri,
        imagen_url: pendingPhotoData.uri,
        descripcion,
        orden_en_respuesta: nextOrder,
        sincronizada: false,
        fecha_captura: new Date().toISOString(),
      };

      const updatedPhotos = [...photos, newPhoto];
      setPhotos(updatedPhotos);

      await checklistService.saveOfflinePhoto({
        local_id: localId,
        instanceId: instance?.id,
        item_template: item.id,
        responseId,
        uri: pendingPhotoData.uri,
        descripcion,
        orden_en_respuesta: nextOrder,
        created_at: new Date().toISOString(),
        synced: false,
      } as any);

      // Completo en checklist cuando hay el mínimo; las fotos pendientes
      // se suben al "Guardar y continuar" o al finalizar el checklist.
      const meetsMin = updatedPhotos.length >= (item.min_fotos || 1);
      await onSave({
        id: responseId,
        completado: meetsMin,
        respuesta_texto: `${updatedPhotos.length} foto(s) de evidencia`,
      }, { silent: true });
    } catch (error) {
      console.error('❌ Error agregando foto local:', error);
      Alert.alert('Error', 'No se pudo agregar la foto. Intenta de nuevo.');
    } finally {
      setPendingPhotoData(null);
      setPhotoDescriptionInput('');
    }
  };

  const syncPendingPhotos = async (responseId: number) => {
    if (!uploadPhoto) return { success: true as const, photos };

    let nextPhotos = [...photos];
    const pendingIndexes = nextPhotos
      .map((p, index) => ({ p, index }))
      .filter(({ p }) => !p.id && (p.uri || p.imagen_url));

    for (let i = 0; i < pendingIndexes.length; i += 1) {
      const { p, index } = pendingIndexes[i];
      setUploadProgressText(`Subiendo foto ${i + 1} de ${pendingIndexes.length}…`);
      const uri = p.uri || p.imagen_url;
      const orden = p.orden_en_respuesta || index + 1;
      const uploadResult = await uploadPhoto(uri, responseId, orden, p.descripcion);

      if (uploadResult.success && uploadResult.data) {
        const serverPhoto = uploadResult.data;
        nextPhotos[index] = {
          ...p,
          ...serverPhoto,
          local_id: p.local_id,
          uri: p.uri,
          imagen_url: serverPhoto.imagen_url || p.imagen_url || p.uri,
          sincronizada: true,
        };
        if (p.local_id) {
          await checklistService.markOfflinePhotoSynced(p.local_id, serverPhoto);
        }
      } else {
        setPhotos(nextPhotos);
        return {
          success: false as const,
          message: uploadResult.message || 'No se pudo subir una de las fotos',
          photos: nextPhotos,
        };
      }
    }

    setPhotos(nextPhotos);
    return { success: true as const, photos: nextPhotos };
  };

  const handlePhotoSaveAndContinue = async () => {
    const minRequired = item.min_fotos || 1;
    if (photos.length < minRequired) {
      Alert.alert(
        'Faltan fotos',
        `Agrega al menos ${minRequired} foto${minRequired !== 1 ? 's' : ''} antes de continuar.`,
      );
      return;
    }

    const hasPendingUpload = photos.some((p) => !p.id);
    setUploadingPhoto(true);
    setUploadProgressText(hasPendingUpload ? 'Subiendo fotos…' : 'Guardando…');

    try {
      let responseId = response?.id;
      if (!responseId) {
        const saveResult = await onSave({ completado: false }, { silent: true });
        responseId = saveResult?.data?.id;
        if (!responseId) {
          Alert.alert('Error', 'No se pudo registrar la respuesta del item. Intenta de nuevo.');
          return;
        }
      }

      // Mejor esfuerzo: si falla la red, igual marcamos completo y se reintenta al finalizar.
      const syncResult = await syncPendingPhotos(responseId);
      if (!syncResult.success) {
        console.warn('⚠️ Fotos pendientes; se reintentarán al finalizar:', syncResult.message);
      }

      const finalPhotos = syncResult.photos;
      await onSave({
        id: responseId,
        completado: finalPhotos.length >= minRequired,
        respuesta_texto: `${finalPhotos.length} foto(s) de evidencia`,
      });
    } catch (error) {
      console.error('❌ Error guardando fotos:', error);
      Alert.alert('Error', 'No se pudo guardar el ítem de fotos. Intenta de nuevo.');
    } finally {
      setUploadingPhoto(false);
      setUploadProgressText(null);
    }
  };

  // Eliminar foto
  const handleDeletePhoto = async (photo: any, index: number) => {
    Alert.alert(
      'Eliminar foto',
      `¿Eliminar "${photo.descripcion || `Foto ${index + 1}`}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            // Si tiene ID del servidor, intentar eliminar en backend.
            // Tolerante: si el registro ya no existe (404) o falla, igual lo
            // quitamos localmente para no dejar fotos "en blanco" atascadas.
            if (photo.id && deletePhoto) {
              const result = await deletePhoto(photo.id);
              if (!result.success) {
                console.warn('⚠️ No se pudo eliminar la foto en backend, se quita localmente:', result.message);
              }
            }
            // Si es foto local pendiente, eliminar del storage offline
            if (photo.local_id) {
              await checklistService.removeOfflinePhoto(photo.local_id);
            }
            const updatedPhotos = photos.filter((_, i) => i !== index);
            setPhotos(updatedPhotos);
            const isComplete = updatedPhotos.length >= (item.min_fotos || 1);
            await onSave({
              completado: isComplete,
              respuesta_texto: updatedPhotos.length > 0
                ? `${updatedPhotos.length} foto(s) de evidencia`
                : '',
            }, { silent: true });
          },
        },
      ]
    );
  };

  // Determinar si este item pide solo firma del técnico, solo del cliente, o ambas
  const getSignatureMode = (): SignatureMode => {
    const text = (item.pregunta_texto || '').toLowerCase();
    if (/firma del cliente/i.test(text) && !/técnico|tecnico/.test(text)) {
      return 'cliente_only';
    }
    if (/firma del técnico|firma del tecnico|técnico responsable|tecnico responsable/i.test(text)) {
      return 'tecnico_only';
    }
    return 'both';
  };

  const signatureMode = getSignatureMode();
  const ordenSignatureDisplay = useOrdenSignatureDisplay(instance?.orden);

  // Función para manejar el resultado de la firma digital
  const handleSignatureComplete = async (firmaTecnico: string, firmaCliente: string, ubicacion: { lat: number; lng: number }) => {
    try {
      console.log('✍️ Procesando firma(s) para item:', item.id, 'modo:', signatureMode);

      await onSave({
        completado: true,
        respuesta_texto: `Firma capturada en ubicación (${ubicacion.lat.toFixed(4)}, ${ubicacion.lng.toFixed(4)})`,
        respuesta_seleccion: {
          firma_tecnico: firmaTecnico || undefined,
          firma_cliente: firmaCliente || undefined,
          ubicacion_captura: ubicacion,
          fecha_captura: new Date().toISOString()
        }
      });

      setShowSignatureModal(false);

      const msg =
        signatureMode === 'tecnico_only'
          ? 'Firma del técnico responsable registrada correctamente.'
          : signatureMode === 'cliente_only'
            ? 'Firma del cliente registrada correctamente.'
            : 'Firmas del técnico y del cliente registradas correctamente.';
      Alert.alert('✍️ Firma(s) guardada(s)', msg, [{ text: 'Continuar' }]);

    } catch (error: any) {
      console.error('❌ Error procesando firmas para item:', error);
      Alert.alert(
        'Error al Guardar Firmas',
        `No se pudieron guardar las firmas para este paso:\n\n${error.message || 'Error desconocido'}\n\nPuedes intentar nuevamente.`,
        [
          { text: 'Reintentar', onPress: () => setShowSignatureModal(true) },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
    }
  };

  const handleSignatureCancel = () => {
    console.log('❌ Firma cancelada por el usuario');
    setShowSignatureModal(false);
  };

  // Tipos que usan selección única (una sola opción marcada)
  const SINGLE_SELECT_TYPES = [
    'SELECT',
    'FLUID_LEVEL',
    'EXTERIOR_INSPECTION',
    'INTERIOR_INSPECTION',
    'ENGINE_INSPECTION',
    'ELECTRICAL_CHECK',
    'BRAKE_CHECK',
    'SUSPENSION_CHECK',
    'TIRE_CONDITION',
    'VEHICLE_CONDITION',
  ];
  const isSingleSelect = SINGLE_SELECT_TYPES.includes(item.tipo_pregunta);

  // Renderizar opciones de selección - Minimalista
  const renderSelectOptions = () => {
    if (!item.opciones_seleccion) return null;

    const isSelected = (opcion: any) => {
      if (isSingleSelect) {
        return inputValue === opcion || String(inputValue) === String(opcion);
      }
      const currentValues = Array.isArray(inputValue) ? inputValue : [];
      return currentValues.includes(opcion);
    };

    return item.opciones_seleccion.map((opcion: any, index: number) => {
      const selected = isSelected(opcion);

      return (
        <TouchableOpacity
          key={index}
          style={[
            styles.modernOptionButton,
            selected && styles.modernOptionButtonSelected,
          ]}
          onPress={() => {
            if (isSingleSelect) {
              handleInputChange(opcion);
            } else {
              // MULTISELECT / SERVICE_SELECTION
              const currentValues = Array.isArray(inputValue) ? inputValue : [];
              if (currentValues.includes(opcion)) {
                handleInputChange(currentValues.filter((v: any) => v !== opcion));
              } else {
                handleInputChange([...currentValues, opcion]);
              }
            }
          }}
        >
          {selected && (
            <InstitutionalIcon name="check-circle" size={18} color={I.onPrimary} style={styles.optionCheckIcon}  strokeWidth={ICON_STROKE_WIDTH} />
          )}
          <Text style={[
            styles.modernOptionText,
            selected && styles.modernOptionTextSelected,
          ]}>
            {opcion}
          </Text>
        </TouchableOpacity>
      );
    });
  };

  // Renderizar campo de calificación (1-5 estrellas)
  const renderRatingInput = () => {
    const rating = parseInt(inputValue) || 0;

    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleInputChange(star.toString())}
            style={styles.starButton}
          >
            <InstitutionalIcon
              name={star <= rating ? 'star' : 'star-border'}
              size={32}
              color={star <= rating ? I.accentYellow : I.hairline}
             strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        ))}
        <Text style={styles.ratingText}>
          {rating > 0 ? `${rating}/5` : 'Sin calificación'}
        </Text>
      </View>
    );
  };

  // Renderizar vista previa de fotos
  const renderPhotoPreview = () => {
    if (photos.length === 0) return null;

    return (
      <View style={styles.photoPreviewContainer}>
        <Text style={styles.photoPreviewTitle}>
          {photos.length} foto{photos.length !== 1 ? 's' : ''} de evidencia
        </Text>
        <View style={styles.photoGrid}>
          {photos.map((photo, index) => {
            const imageUri = photo.imagen_url || photo.uri;
            const desc = photo.descripcion || `Foto ${index + 1}`;
            const isSynced = !!photo.id;
            return (
              <View key={photo.local_id ?? photo.id ?? `local-${index}`} style={styles.photoCard}>
                <View style={styles.photoCardImageWrapper}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.photoCardImage}
                    resizeMode="cover"
                  />
                  {/* Badge de estado sincronización */}
                  <View style={[styles.photoSyncBadge, isSynced ? styles.photoSyncBadgeSynced : styles.photoSyncBadgePending]}>
                    <InstitutionalIcon
                      name={isSynced ? 'cloud-done' : 'cloud-off'}
                      size={12}
                      color={I.onPrimary}
                     strokeWidth={ICON_STROKE_WIDTH} />
                  </View>
                  {/* Botón eliminar */}
                  <TouchableOpacity
                    style={styles.photoDeleteButton}
                    onPress={() => handleDeletePhoto(photo, index)}
                    disabled={uploadingPhoto}
                  >
                    <InstitutionalIcon name="delete" size={16} color={I.onPrimary}  strokeWidth={ICON_STROKE_WIDTH} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.photoCardDesc} numberOfLines={2}>{desc}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderItemComponent = () => {
    console.log('🔄 Renderizando item tipo:', item.tipo_pregunta);

    const baseProps = {
      item,
      value: inputValue,
      onValueChange: handleInputChange,
      disabled: false,
    };

    switch (item.tipo_pregunta) {
      case 'TEXT':
      case 'FINAL_NOTES':
      case 'WORK_SUMMARY':
        return (
          <TextInput
            style={[
              styles.modernTextInput,
              item.tipo_pregunta === 'FINAL_NOTES' || item.tipo_pregunta === 'WORK_SUMMARY'
                ? styles.multilineTextInput
                : styles.singleLineTextInput
            ]}
            value={inputValue}
            onChangeText={handleInputChange}
            placeholder={item.placeholder || 'Ingrese su respuesta...'}
            placeholderTextColor={I.mutedSoft}
            multiline={item.tipo_pregunta === 'FINAL_NOTES' || item.tipo_pregunta === 'WORK_SUMMARY'}
            textAlignVertical={item.tipo_pregunta === 'FINAL_NOTES' || item.tipo_pregunta === 'WORK_SUMMARY' ? 'top' : 'center'}
            editable={!false}
          />
        );

      case 'NUMBER':
      case 'KILOMETER_INPUT':
        return (
          <View style={styles.numberInputWrapper}>
            <TextInput
              style={
                item.tipo_pregunta === 'KILOMETER_INPUT'
                  ? styles.kilometerHeroInput
                  : styles.modernTextInput
              }
              value={inputValue}
              onChangeText={handleInputChange}
              placeholder={item.placeholder || (item.tipo_pregunta === 'KILOMETER_INPUT' ? '0' : '0')}
              placeholderTextColor={I.mutedSoft}
              keyboardType="numeric"
              editable={!false}
            />
            {item.tipo_pregunta === 'KILOMETER_INPUT' ? (
              <Text style={styles.kilometerUnitLabel}>Kilómetros</Text>
            ) : null}
            {(item.valor_minimo != null || item.valor_maximo != null) && (
              <Text style={styles.rangeHint}>
                {item.valor_minimo != null && item.valor_maximo != null
                  ? `Entre ${Number(item.valor_minimo).toLocaleString('es-CL')} y ${Number(item.valor_maximo).toLocaleString('es-CL')}`
                  : item.valor_minimo != null
                    ? `Mínimo ${Number(item.valor_minimo).toLocaleString('es-CL')}`
                    : `Máximo ${Number(item.valor_maximo).toLocaleString('es-CL')}`}
              </Text>
            )}
          </View>
        );

      case 'BOOLEAN':
        return (
          <View style={styles.modernBooleanContainer}>
            <TouchableOpacity
              style={[
                styles.modernBooleanButton,
                inputValue === true && styles.modernBooleanButtonSelected,
              ]}
              onPress={() => handleInputChange(true)}
            >
              <Text style={[
                styles.modernBooleanButtonText,
                inputValue === true && styles.modernBooleanButtonTextSelected,
              ]}>
                Sí
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modernBooleanButton,
                inputValue === false && styles.modernBooleanButtonSelected,
              ]}
              onPress={() => handleInputChange(false)}
            >
              <Text style={[
                styles.modernBooleanButtonText,
                inputValue === false && styles.modernBooleanButtonTextSelected,
              ]}>
                No
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'SELECT':
        return (
          <View style={styles.modernSelectContainer}>
            {renderSelectOptions()}
          </View>
        );

      case 'MULTISELECT':
      case 'SERVICE_SELECTION':
      case 'VEHICLE_CONDITION':
      case 'ELECTRICAL_CHECK':
      case 'BRAKE_CHECK':
      case 'SUSPENSION_CHECK':
      case 'TIRE_CONDITION':
      case 'EXTERIOR_INSPECTION':
      case 'INTERIOR_INSPECTION':
      case 'ENGINE_INSPECTION':
      case 'FLUID_LEVEL':
        return (
          <View style={styles.modernSelectContainer}>
            {renderSelectOptions()}
          </View>
        );

      case 'INVENTORY_CHECKLIST':
        return (
          <InventoryChecklistComponent
            item={item}
            respuesta={response}
            onResponseChange={handleInputChange}
            disabled={false}
          />
        );

      case 'FUEL_GAUGE':
        return (
          <FuelGaugeComponent
            item={item}
            respuesta={response}
            onResponseChange={handleInputChange}
            disabled={false}
          />
        );

      case 'COMPONENT_HEALTH': {
        const numericValue =
          inputValue === '' || inputValue === null || inputValue === undefined
            ? null
            : Number(inputValue);
        const safeValue =
          typeof numericValue === 'number' && Number.isFinite(numericValue)
            ? numericValue
            : null;
        return (
          <ComponentHealthSlider
            value={safeValue}
            onChange={(v) => handleInputChange(v)}
            min={item.valor_minimo ?? 0}
            max={item.valor_maximo ?? 100}
          />
        );
      }

      case 'PHOTO':
        return (
          <View style={styles.modernPhotoContainer}>
            {/* Botones de agregar */}
            <View style={styles.modernPhotoButtonsContainer}>
              <TouchableOpacity
                style={[styles.modernPhotoButton, uploadingPhoto && styles.modernPhotoButtonDisabled]}
                onPress={handleTakePicture}
                disabled={uploadingPhoto}
              >
                <InstitutionalIcon name="camera-alt" size={22} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.modernPhotoButtonText}>Tomar Foto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modernPhotoButton, uploadingPhoto && styles.modernPhotoButtonDisabled]}
                onPress={handlePickFromGallery}
                disabled={uploadingPhoto}
              >
                <InstitutionalIcon name="photo-library" size={22} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.modernPhotoButtonText}>Galería</Text>
              </TouchableOpacity>
            </View>

            {uploadingPhoto && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color={I.primary} />
                <Text style={styles.uploadingText}>
                  {uploadProgressText || 'Subiendo fotos…'}
                </Text>
              </View>
            )}

            {/* Requisito de fotos mínimas */}
            <View style={styles.photoRequirementRow}>
              <InstitutionalIcon
                name={photos.length >= (item.min_fotos || 1) ? 'check-circle' : 'info'}
                size={14}
                color={photos.length >= (item.min_fotos || 1) ? I.semanticUp : I.muted}
                strokeWidth={ICON_STROKE_WIDTH}
              />
              <Text style={[
                styles.photoRequirement,
                photos.length >= (item.min_fotos || 1) && styles.photoRequirementMet,
              ]}>
                {item.min_fotos != null && item.min_fotos > 0
                  ? `Mínimo ${item.min_fotos} foto${item.min_fotos !== 1 ? 's' : ''} · `
                  : ''}
                {photos.length} agregada{photos.length !== 1 ? 's' : ''}
                {photos.some((p) => !p.id)
                  ? ` · ${photos.filter((p) => !p.id).length} pendiente${photos.filter((p) => !p.id).length !== 1 ? 's' : ''} de subir`
                  : photos.length > 0
                    ? ' · listas'
                    : ''}
              </Text>
            </View>

            {/* Vista previa */}
            {renderPhotoPreview()}

            {/* Modal de descripción */}
            <Modal
              visible={showDescriptionModal}
              transparent
              animationType="slide"
              onRequestClose={() => {
                setShowDescriptionModal(false);
                setPendingPhotoData(null);
              }}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.descriptionModalOverlay}
              >
                <View style={styles.descriptionModalSheet}>
                  <View style={styles.descriptionModalHandle} />

                  <Text style={styles.descriptionModalTitle}>
                    Describe esta evidencia
                  </Text>
                  <Text style={styles.descriptionModalSubtitle}>
                    Una descripción clara ayuda a identificar el trabajo realizado.
                    {'\n'}Ej: "Motor antes del servicio", "Filtro de aceite reemplazado"
                  </Text>

                  {/* Preview de la foto pendiente */}
                  {pendingPhotoData?.uri && (
                    <Image
                      source={{ uri: pendingPhotoData.uri }}
                      style={styles.descriptionModalPreview}
                      resizeMode="cover"
                    />
                  )}

                  <TextInput
                    style={styles.descriptionInput}
                    value={photoDescriptionInput}
                    onChangeText={setPhotoDescriptionInput}
                    placeholder="Descripción de la foto..."
                    placeholderTextColor={I.mutedSoft}
                    maxLength={120}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handlePhotoSubmit}
                  />
                  <Text style={styles.descriptionCharCount}>
                    {photoDescriptionInput.length}/120
                  </Text>

                  <View style={styles.descriptionModalActions}>
                    <TouchableOpacity
                      style={styles.descriptionCancelButton}
                      onPress={() => {
                        setShowDescriptionModal(false);
                        setPendingPhotoData(null);
                        setPhotoDescriptionInput('');
                      }}
                    >
                      <Text style={styles.descriptionCancelText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.descriptionConfirmButton}
                      onPress={handlePhotoSubmit}
                      disabled={uploadingPhoto}
                    >
                      <InstitutionalIcon name="add-photo-alternate" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                      <Text style={styles.descriptionConfirmText}>Agregar foto</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </Modal>
          </View>
        );

      case 'SIGNATURE':
        {
          const signatureButtonLabel =
            response?.completado
              ? (signatureMode === 'tecnico_only'
                  ? 'Firma del técnico capturada ✓'
                  : signatureMode === 'cliente_only'
                    ? 'Firma del cliente capturada ✓'
                    : 'Firmas capturadas ✓')
              : (signatureMode === 'tecnico_only'
                  ? 'Capturar firma del técnico'
                  : signatureMode === 'cliente_only'
                    ? 'Capturar firma del cliente'
                    : 'Capturar firmas (técnico y cliente)');

          return (
            <View style={styles.modernSignatureContainer}>
              <TouchableOpacity
                style={styles.modernSignatureButton}
                onPress={() => {
                  setShowSignatureModal(true);
                }}
              >
                <InstitutionalIcon name="gesture" size={22} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.modernSignatureButtonText}>
                  {signatureButtonLabel}
                </Text>
              </TouchableOpacity>

              {item.descripcion_ayuda && (
                <Text style={styles.modernSignatureHelp}>
                  {item.descripcion_ayuda}
                </Text>
              )}
            </View>
          );
        }

      case 'DATETIME':
        return (
          <TouchableOpacity
            style={styles.modernSelectButton}
            onPress={() => {
              // Por ahora usar fecha/hora actual
              const now = new Date().toISOString();
              handleInputChange(now);
            }}
          >
            <InstitutionalIcon name="schedule" size={20} color={I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.modernSelectButtonText}>
              {inputValue ? new Date(inputValue).toLocaleString('es-ES') : 'Seleccionar fecha y hora'}
            </Text>
            <InstitutionalIcon name="arrow-drop-down" size={20} color={I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        );

      case 'RATING':
        return renderRatingInput();

      case 'LOCATION':
        return (
          <TouchableOpacity
            style={styles.modernSelectButton}
            onPress={() => {
              // Por ahora simular ubicación
              handleInputChange({ lat: -34.6037, lng: -58.3816 });
            }}
          >
            <InstitutionalIcon name="location-on" size={20} color={I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.modernSelectButtonText}>
              {inputValue ? 'Ubicación capturada ✓' : 'Obtener ubicación GPS'}
            </Text>
          </TouchableOpacity>
        );

      case 'VEHICLE_DIAGRAM':
        return (
          <View style={styles.notImplementedContainer}>
            <InstitutionalIcon name="directions-car" size={24} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.notImplementedText}>
              Diagrama de vehículo - En desarrollo
            </Text>
          </View>
        );

      case 'DAMAGE_REPORT':
        return (
          <TextInput
            style={[styles.modernTextInput, styles.multilineTextInput]}
            value={inputValue}
            onChangeText={handleInputChange}
            placeholder={item.placeholder || 'Describa los daños encontrados durante el diagnóstico...'}
            placeholderTextColor={I.mutedSoft}
            multiline={true}
            numberOfLines={6}
            textAlignVertical="top"
            editable={!false}
          />
        );

      case 'CLIENT_CONFIRMATION':
        return (
          <View style={styles.modernBooleanContainer}>
            <TouchableOpacity
              style={[
                styles.modernBooleanButton,
                inputValue === true && styles.modernBooleanButtonSelected,
              ]}
              onPress={() => handleInputChange(true)}
            >
              <InstitutionalIcon
                name="check-circle"
                size={20}
                color={inputValue === true ? I.onPrimary : I.semanticUp}
               strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={[
                styles.modernBooleanButtonText,
                inputValue === true && styles.modernBooleanButtonTextSelected,
              ]}>
                Cliente Confirma
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modernBooleanButton,
                inputValue === false && styles.modernBooleanButtonSelected,
              ]}
              onPress={() => handleInputChange(false)}
            >
              <InstitutionalIcon
                name="cancel"
                size={20}
                color={inputValue === false ? I.onPrimary : I.semanticDown}
               strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={[
                styles.modernBooleanButtonText,
                inputValue === false && styles.modernBooleanButtonTextSelected,
              ]}>
                Cliente No Confirma
              </Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return (
          <View style={styles.unsupportedContainer}>
            <InstitutionalIcon name="help" size={24} color={I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
            <View>
              <Text style={styles.unsupportedText}>
                Tipo: {item.tipo_pregunta}
              </Text>
              <Text style={styles.unsupportedSubtext}>
                {getDisplayNameForTipoPregunta(item.tipo_pregunta)}
              </Text>
            </View>
          </View>
        );
    }
  };

  const getDefaultValueForType = (tipoPregunta: string): any => {
    console.log('🔧 Obteniendo valor por defecto para tipo:', tipoPregunta);

    switch (tipoPregunta) {
      case 'TEXT':
        return { texto: '', completado: false };

      case 'NUMBER':
      case 'KILOMETER_INPUT':
        return { numero: undefined, completado: false };

      case 'BOOLEAN':
        return { booleana: undefined, completado: false };

      case 'SELECT':
      case 'FUEL_GAUGE':
        return { seleccion: '', completado: false };

      case 'MULTISELECT':
      case 'SERVICE_SELECTION':
      case 'VEHICLE_CONDITION':
      case 'INVENTORY_CHECKLIST':
        return { seleccion: [], completado: false };

      case 'PHOTO':
        return { fotos: 0, completado: false };

      case 'SIGNATURE':
        return { texto: 'Firmas pendientes', completado: false };

      case 'RATING':
        return { numero: 0, completado: false };

      case 'DATETIME':
        return { fecha: undefined, completado: false };

      case 'LOCATION':
        return { ubicacion: undefined, completado: false };

      default:
        console.log('⚠️ Tipo no reconocido, usando valor por defecto básico');
        return { texto: '', completado: false };
    }
  };

  const parseResponseValue = (respuesta: ChecklistItemResponse): any => {
    const tipoPregunta = item.tipo_pregunta;
    console.log('📝 Parseando respuesta para tipo:', tipoPregunta, 'respuesta:', respuesta);

    switch (tipoPregunta) {
      case 'TEXT':
        return respuesta.respuesta_texto || '';

      case 'NUMBER':
      case 'KILOMETER_INPUT':
        return respuesta.respuesta_numero !== null ? respuesta.respuesta_numero : undefined;

      case 'BOOLEAN':
        return respuesta.respuesta_booleana;

      case 'SELECT':
      case 'FUEL_GAUGE':
        return respuesta.respuesta_seleccion || '';

      case 'MULTISELECT':
      case 'SERVICE_SELECTION':
      case 'VEHICLE_CONDITION':
      case 'INVENTORY_CHECKLIST':
        try {
          return Array.isArray(respuesta.respuesta_seleccion) ? respuesta.respuesta_seleccion : [];
        } catch (e) {
          console.log('Error parseando selección múltiple:', e);
          return [];
        }

      case 'PHOTO':
        return (respuesta.fotos && respuesta.fotos.length > 0) ? respuesta.fotos.length : 0;

      case 'SIGNATURE':
        return respuesta.respuesta_texto || 'Firmas pendientes';

      case 'RATING':
        return respuesta.respuesta_numero || 0;

      case 'DATETIME':
        return respuesta.respuesta_fecha;

      case 'LOCATION':
        return respuesta.respuesta_ubicacion;

      default:
        console.log('⚠️ Tipo no reconocido en parseResponseValue:', tipoPregunta);
        return respuesta.respuesta_texto || '';
    }
  };

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.questionNumberBadge}>
              <Text style={styles.questionNumber}>{item.orden_visual || '?'}</Text>
            </View>
            <View style={styles.questionContent}>
              <Text style={styles.questionText}>{item.pregunta_texto}</Text>
              {item.descripcion_ayuda && (
                <Text style={styles.helpText}>{item.descripcion_ayuda}</Text>
              )}
            </View>
          </View>
          {item.es_obligatorio_efectivo && (
            <View style={styles.requiredBadgeContainer}>
              <InstitutionalIcon name="star" size={14} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
          )}
        </View>
      )}

      {/* Banner de salud actual del componente vinculado (refactor 2026) */}
      {saludSnapshot && saludSnapshot.componente && (
        <SaludActualBanner snapshot={saludSnapshot} />
      )}

      {/* Campo de entrada según el tipo */}
      <View style={styles.inputContainer}>
        {renderItemComponent()}

        {/* FECHA Y HORA */}
        {item.tipo_pregunta === 'DATETIME' && (
          <TouchableOpacity style={styles.modernSelectButton}>
            <InstitutionalIcon name="schedule" size={20} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.modernSelectButtonText}>
              {inputValue ? new Date(inputValue).toLocaleString('es-ES') : 'Seleccionar fecha y hora'}
            </Text>
            <InstitutionalIcon name="arrow-drop-down" size={20} color={I.muted}  strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        )}

        {/* UBICACIÓN GPS */}
        {item.tipo_pregunta === 'LOCATION' && (
          <TouchableOpacity style={styles.modernSelectButton}>
            <InstitutionalIcon name="location-on" size={20} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.modernSelectButtonText}>
              {inputValue ? 'Ubicación capturada ✓' : 'Obtener ubicación GPS'}
            </Text>
          </TouchableOpacity>
        )}

        {/* TIPOS NO IMPLEMENTADOS */}
        {![
          'TEXT',
          'NUMBER',
          'KILOMETER_INPUT',
          'BOOLEAN',
          'CLIENT_CONFIRMATION',
          'SELECT',
          'MULTISELECT',
          'SERVICE_SELECTION',
          'VEHICLE_CONDITION',
          'ELECTRICAL_CHECK',
          'BRAKE_CHECK',
          'SUSPENSION_CHECK',
          'TIRE_CONDITION',
          'EXTERIOR_INSPECTION',
          'INTERIOR_INSPECTION',
          'ENGINE_INSPECTION',
          'FLUID_LEVEL',
          'INVENTORY_CHECKLIST',
          'FUEL_GAUGE',
          'COMPONENT_HEALTH',
          'RATING',
          'PHOTO',
          'DATETIME',
          'LOCATION',
          'SIGNATURE',
        ].includes(item.tipo_pregunta) && (
          <View style={styles.notImplementedContainer}>
            <InstitutionalIcon name="warning" size={20} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.notImplementedText}>
              Tipo de pregunta '{item.tipo_pregunta}' no implementado aún
            </Text>
          </View>
        )}
      </View>

      {/* CTA principal */}
      {item.tipo_pregunta === 'PHOTO' ? (
        <View style={{ marginTop: 8, gap: 10 }}>
          {response?.completado && photos.every((p) => p.id) ? (
            <View style={styles.completedIndicator}>
              <InstitutionalIcon name="check-circle" size={18} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.completedText}>Completado</Text>
            </View>
          ) : null}
          <InstitutionalButton
            label={
              uploadingPhoto
                ? (uploadProgressText || 'Subiendo…')
                : response?.completado
                  ? 'Actualizar y continuar'
                  : 'Guardar y continuar'
            }
            variant="primary"
            loading={uploadingPhoto || saving}
            disabled={
              uploadingPhoto
              || saving
              || photos.length < (item.min_fotos || 1)
            }
            onPress={handlePhotoSaveAndContinue}
          />
        </View>
      ) : (
        <View style={{ marginTop: 8, gap: 10 }}>
          {response?.completado ? (
            <View style={styles.completedIndicator}>
              <InstitutionalIcon name="check-circle" size={18} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.completedText}>Completado</Text>
            </View>
          ) : null}
          <InstitutionalButton
            label={saving ? 'Guardando…' : response?.completado ? 'Actualizar y continuar' : 'Guardar y continuar'}
            variant="primary"
            loading={saving}
            disabled={saving || (!isModified && !response?.completado && String(inputValue ?? '').trim() === '')}
            onPress={handleSave}
          />
        </View>
      )}

      {/* Modal de firma digital (una sola firma según el item: técnico o cliente) */}
      {showSignatureModal && (
        <ChecklistSignatureModal
          visible={showSignatureModal}
          onComplete={handleSignatureComplete}
          onClose={handleSignatureCancel}
          signatureMode={signatureMode}
          ordenInfo={{
            id: instance?.orden_info?.id || instance?.orden || 0,
            cliente: ordenSignatureDisplay.cliente,
            vehiculo: ordenSignatureDisplay.vehiculo,
          }}
        />
      )}
    </View>
  );
};

