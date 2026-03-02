import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
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
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ChecklistItemTemplate, ChecklistItemResponse, ChecklistInstance } from '@/services/checklistService';
import { ChecklistSignatureModal } from './ChecklistSignatureModal';
import { InventoryChecklistComponent } from './items/InventoryChecklistComponent';
import { FuelGaugeComponent } from './items/FuelGaugeComponent';
import {
  checklistService,
  getDisplayNameForCategoria,
  getDisplayNameForTipoPregunta
} from '@/services/checklistService';

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
}

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
}) => {
  const [inputValue, setInputValue] = useState<any>('');
  const [isModified, setIsModified] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Estado para el flujo de fotos con descripción
  const [pendingPhotoData, setPendingPhotoData] = useState<any>(null);
  const [photoDescriptionInput, setPhotoDescriptionInput] = useState('');
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);

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
          if (response.fotos && response.fotos.length > 0) {
            setPhotos(response.fotos);
            console.log('✅ Fotos cargadas:', response.fotos.length);
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
      // Inicializar con valores por defecto según el tipo
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
        default:
          setInputValue('');
      }
    }
  }, [response, item]);

  // Función para guardar la respuesta
  const handleSave = async () => {
    let responseData: any = {};

    switch (item.tipo_pregunta) {
      case 'TEXT':
      case 'DAMAGE_REPORT':
        responseData.respuesta_texto = inputValue;
        break;
      case 'NUMBER':
      case 'KILOMETER_INPUT':
      case 'RATING':
        responseData.respuesta_numero = parseFloat(inputValue) || 0;
        break;
      case 'BOOLEAN':
        responseData.respuesta_booleana = inputValue;
        break;
      case 'SELECT':
      case 'MULTISELECT':
        responseData.respuesta_seleccion = inputValue;
        break;
      case 'DATETIME':
        responseData.respuesta_fecha = inputValue;
        break;
      case 'PHOTO':
        // Para fotos, solo marcamos como completado si hay fotos
        responseData.completado = photos.length > 0;
        break;
    }

    await onSave(responseData);
    setIsModified(false);
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

  // Confirmación: subir foto con descripción al backend
  const handlePhotoSubmit = async () => {
    if (!pendingPhotoData) return;

    setShowDescriptionModal(false);
    setUploadingPhoto(true);

    const descripcion = photoDescriptionInput.trim() || `Foto ${photos.length + 1}`;
    const nextOrder = photos.length + 1;

    try {
      // Paso 1: asegurar que existe una respuesta en el backend
      let responseId = response?.id;
      if (!responseId) {
        console.log('📝 Creando respuesta inicial para item PHOTO...');
        const saveResult = await onSave({ completado: false }, { silent: true });
        responseId = saveResult?.data?.id;
        if (!responseId) {
          Alert.alert('Error', 'No se pudo registrar la respuesta del item. Intenta de nuevo.');
          return;
        }
      }

      // Paso 2: subir la imagen al servidor
      let serverPhoto: any = null;
      if (uploadPhoto) {
        console.log(`☁️ Subiendo foto #${nextOrder} al servidor...`);
        const uploadResult = await uploadPhoto(
          pendingPhotoData.uri,
          responseId,
          nextOrder,
          descripcion
        );
        if (uploadResult.success && uploadResult.data) {
          serverPhoto = uploadResult.data;
          console.log('✅ Foto subida exitosamente:', serverPhoto.id);
        } else {
          console.warn('⚠️ Error al subir foto:', uploadResult.message);
          Alert.alert('Advertencia', 'La foto se guardó localmente pero no se pudo subir al servidor. Se sincronizará cuando tengas conexión.');
        }
      }

      // Paso 3: agregar a la lista local (usando datos del servidor si están disponibles)
      const newPhoto = serverPhoto ?? {
        uri: pendingPhotoData.uri,
        imagen_url: pendingPhotoData.uri,
        descripcion,
        orden_en_respuesta: nextOrder,
        sincronizada: false,
        fecha_captura: new Date().toISOString(),
      };

      const updatedPhotos = [...photos, newPhoto];
      setPhotos(updatedPhotos);

      // Paso 4: marcar como completado si supera el mínimo
      const isComplete = updatedPhotos.length >= (item.min_fotos || 1);
      await onSave({
        completado: isComplete,
        respuesta_texto: `${updatedPhotos.length} foto(s) de evidencia`,
      }, { silent: true });

      console.log(`🎯 Foto #${nextOrder} procesada. Total: ${updatedPhotos.length}. Completado: ${isComplete}`);

    } catch (error) {
      console.error('❌ Error procesando foto:', error);
      Alert.alert('Error', 'No se pudo procesar la foto. Intenta de nuevo.');
    } finally {
      setUploadingPhoto(false);
      setPendingPhotoData(null);
      setPhotoDescriptionInput('');
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
            // Si tiene ID del servidor, eliminar en backend
            if (photo.id && deletePhoto) {
              const result = await deletePhoto(photo.id);
              if (!result.success) {
                Alert.alert('Error', 'No se pudo eliminar la foto del servidor.');
                return;
              }
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

  // Función para manejar el resultado de la firma digital
  const handleSignatureComplete = async (firmaTecnico: string, firmaCliente: string, ubicacion: { lat: number; lng: number }) => {
    try {
      console.log('✍️ Procesando firmas digitales para item específico...', {
        itemId: item.id,
        itemTipo: item.tipo_pregunta,
        instanceId: instance?.id,
        firmaTecnico: firmaTecnico.substring(0, 20) + '...',
        firmaCliente: firmaCliente.substring(0, 20) + '...',
        ubicacion
      });

      // IMPORTANTE: Este es solo un item SIGNATURE, NO la finalización completa del checklist
      // Solo guardamos la respuesta de este item específico
      await onSave({
        completado: true,
        respuesta_texto: `Firmas digitales capturadas en ubicación (${ubicacion.lat}, ${ubicacion.lng})`,
        // Guardar las firmas en respuesta_seleccion como JSON
        respuesta_seleccion: {
          firma_tecnico: firmaTecnico,
          firma_cliente: firmaCliente,
          ubicacion_captura: ubicacion,
          fecha_captura: new Date().toISOString()
        }
      });

      setShowSignatureModal(false);

      console.log('✅ Respuesta de firmas guardada exitosamente para el item específico');

      // Mensaje de éxito para este item solamente (no todo el checklist)
      Alert.alert(
        '✍️ Firmas Capturadas',
        `Las firmas digitales han sido registradas exitosamente para este paso del checklist.\n\n✅ Firma del técnico capturada\n✅ Firma del cliente capturada\n✅ Ubicación GPS registrada\n\nPuedes continuar con los siguientes pasos del checklist.`,
        [
          {
            text: 'Continuar',
            onPress: () => {
              console.log('🎯 Usuario confirmó captura de firmas para este item');
            }
          }
        ]
      );

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
            <MaterialIcons name="check-circle" size={18} color="#ffffff" style={styles.optionCheckIcon} />
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
            <MaterialIcons
              name={star <= rating ? 'star' : 'star-border'}
              size={32}
              color={star <= rating ? '#ffc107' : '#dee2e6'}
            />
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
              <View key={photo.id ?? `local-${index}`} style={styles.photoCard}>
                <View style={styles.photoCardImageWrapper}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.photoCardImage}
                    resizeMode="cover"
                  />
                  {/* Badge de estado sincronización */}
                  <View style={[styles.photoSyncBadge, isSynced ? styles.photoSyncBadgeSynced : styles.photoSyncBadgePending]}>
                    <MaterialIcons
                      name={isSynced ? 'cloud-done' : 'cloud-off'}
                      size={12}
                      color="#fff"
                    />
                  </View>
                  {/* Botón eliminar */}
                  <TouchableOpacity
                    style={styles.photoDeleteButton}
                    onPress={() => handleDeletePhoto(photo, index)}
                    disabled={uploadingPhoto}
                  >
                    <MaterialIcons name="delete" size={16} color="#fff" />
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
            placeholderTextColor="#adb5bd"
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
              style={styles.modernTextInput}
              value={inputValue}
              onChangeText={handleInputChange}
              placeholder={item.placeholder || '0'}
              placeholderTextColor="#adb5bd"
              keyboardType="numeric"
              editable={!false}
            />
            {(item.valor_minimo !== null || item.valor_maximo !== null) && (
              <Text style={styles.rangeHint}>
                Rango: {item.valor_minimo || 0} - {item.valor_maximo || '∞'}
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
                <MaterialIcons name="camera-alt" size={22} color="#003459" />
                <Text style={styles.modernPhotoButtonText}>Tomar Foto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modernPhotoButton, uploadingPhoto && styles.modernPhotoButtonDisabled]}
                onPress={handlePickFromGallery}
                disabled={uploadingPhoto}
              >
                <MaterialIcons name="photo-library" size={22} color="#003459" />
                <Text style={styles.modernPhotoButtonText}>Galería</Text>
              </TouchableOpacity>
            </View>

            {/* Spinner mientras sube */}
            {uploadingPhoto && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color="#003459" />
                <Text style={styles.uploadingText}>Subiendo foto al servidor...</Text>
              </View>
            )}

            {/* Requisito de fotos mínimas */}
            {item.min_fotos != null && item.min_fotos > 0 && (
              <View style={styles.photoRequirementRow}>
                <MaterialIcons
                  name={photos.length >= item.min_fotos ? 'check-circle' : 'info'}
                  size={14}
                  color={photos.length >= item.min_fotos ? '#00C9A7' : '#6c757d'}
                />
                <Text style={[
                  styles.photoRequirement,
                  photos.length >= item.min_fotos && styles.photoRequirementMet,
                ]}>
                  Mínimo {item.min_fotos} foto{item.min_fotos !== 1 ? 's' : ''} requerida{item.min_fotos !== 1 ? 's' : ''}
                  {photos.length > 0 ? ` · ${photos.length} agregada${photos.length !== 1 ? 's' : ''}` : ''}
                </Text>
              </View>
            )}

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
                    placeholderTextColor="#adb5bd"
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
                      {uploadingPhoto ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <MaterialIcons name="cloud-upload" size={18} color="#fff" />
                          <Text style={styles.descriptionConfirmText}>Guardar foto</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </Modal>
          </View>
        );

      case 'SIGNATURE':
        return (
          <View style={styles.modernSignatureContainer}>
            <TouchableOpacity
              style={styles.modernSignatureButton}
              onPress={() => {
                console.log('✍️ Abriendo modal de firma digital para item:', item.id);
                setShowSignatureModal(true);
              }}
            >
              <MaterialIcons name="gesture" size={22} color="#619FF0" />
              <Text style={styles.modernSignatureButtonText}>
                {response?.completado ? 'Firmas capturadas ✓' : 'Capturar Firmas Digitales'}
              </Text>
            </TouchableOpacity>

            {item.descripcion_ayuda && (
              <Text style={styles.modernSignatureHelp}>
                {item.descripcion_ayuda}
              </Text>
            )}
          </View>
        );

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
            <MaterialIcons name="schedule" size={20} color="#6c757d" />
            <Text style={styles.modernSelectButtonText}>
              {inputValue ? new Date(inputValue).toLocaleString('es-ES') : 'Seleccionar fecha y hora'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={20} color="#6c757d" />
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
            <MaterialIcons name="location-on" size={20} color="#6c757d" />
            <Text style={styles.modernSelectButtonText}>
              {inputValue ? 'Ubicación capturada ✓' : 'Obtener ubicación GPS'}
            </Text>
          </TouchableOpacity>
        );

      case 'VEHICLE_DIAGRAM':
        return (
          <View style={styles.notImplementedContainer}>
            <MaterialIcons name="directions-car" size={24} color="#ffc107" />
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
            placeholderTextColor="#adb5bd"
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
              <MaterialIcons
                name="check-circle"
                size={20}
                color={inputValue === true ? '#fff' : '#28a745'}
              />
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
              <MaterialIcons
                name="cancel"
                size={20}
                color={inputValue === false ? '#fff' : '#dc3545'}
              />
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
            <MaterialIcons name="help" size={24} color="#6c757d" />
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
      {/* Header del item - Mejorado según imagen */}
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
            <MaterialIcons name="star" size={16} color="#dc3545" />
          </View>
        )}
      </View>

      {/* Campo de entrada según el tipo */}
      <View style={styles.inputContainer}>
        {renderItemComponent()}

        {/* FECHA Y HORA */}
        {item.tipo_pregunta === 'DATETIME' && (
          <TouchableOpacity style={styles.modernSelectButton}>
            <MaterialIcons name="schedule" size={20} color="#619FF0" />
            <Text style={styles.modernSelectButtonText}>
              {inputValue ? new Date(inputValue).toLocaleString('es-ES') : 'Seleccionar fecha y hora'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={20} color="#6c757d" />
          </TouchableOpacity>
        )}

        {/* UBICACIÓN GPS */}
        {item.tipo_pregunta === 'LOCATION' && (
          <TouchableOpacity style={styles.modernSelectButton}>
            <MaterialIcons name="location-on" size={20} color="#619FF0" />
            <Text style={styles.modernSelectButtonText}>
              {inputValue ? 'Ubicación capturada ✓' : 'Obtener ubicación GPS'}
            </Text>
          </TouchableOpacity>
        )}

        {/* FIRMA DIGITAL */}
        {item.tipo_pregunta === 'SIGNATURE' && (
          <View style={styles.modernSignatureContainer}>
            <TouchableOpacity
              style={styles.modernSignatureButton}
              onPress={() => {
                console.log('✍️ Abriendo modal de firma digital para item:', item.id);
                setShowSignatureModal(true);
              }}
            >
              <MaterialIcons name="gesture" size={22} color="#619FF0" />
              <Text style={styles.modernSignatureButtonText}>
                {response?.completado ? 'Firmas capturadas ✓' : 'Capturar Firmas Digitales'}
              </Text>
            </TouchableOpacity>

            {item.descripcion_ayuda && (
              <Text style={styles.modernSignatureHelp}>
                {item.descripcion_ayuda}
              </Text>
            )}
          </View>
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
          'RATING',
          'PHOTO',
          'DATETIME',
          'LOCATION',
          'SIGNATURE',
        ].includes(item.tipo_pregunta) && (
          <View style={styles.notImplementedContainer}>
            <MaterialIcons name="warning" size={20} color="#ffc107" />
            <Text style={styles.notImplementedText}>
              Tipo de pregunta '{item.tipo_pregunta}' no implementado aún
            </Text>
          </View>
        )}
      </View>

      {/* Botón de guardar - Minimalista */}
      {isModified && item.tipo_pregunta !== 'PHOTO' && (
        <TouchableOpacity
          style={[styles.modernSaveButton, saving && styles.modernSaveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="save" size={18} color="#fff" />
              <Text style={styles.modernSaveButtonText}>Guardar y Continuar</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Indicador de completado */}
      {response?.completado && (
        <View style={styles.completedIndicator}>
          <MaterialIcons name="check-circle" size={18} color="#28a745" />
          <Text style={styles.completedText}>Completado</Text>
        </View>
      )}

      {/* Modal de firma digital */}
      {showSignatureModal && (
        <ChecklistSignatureModal
          visible={showSignatureModal}
          onComplete={handleSignatureComplete}
          onClose={handleSignatureCancel}
          ordenInfo={{
            id: instance?.orden_info?.id || instance?.orden || 0,
            cliente: `Cliente - Orden #${instance?.orden_info?.id || instance?.orden || 0}`,
            vehiculo: `Servicio programado: ${instance?.orden_info?.fecha_servicio || 'Sin fecha'} ${instance?.orden_info?.hora_servicio || ''}`.trim(),
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 0,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  questionNumberBadge: {
    backgroundColor: '#619FF0',
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  questionNumber: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    lineHeight: 28,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 15,
    color: '#6c757d',
    lineHeight: 22,
  },
  requiredIcon: {
    marginLeft: 6,
    marginTop: 2,
  },
  requiredBadgeContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1.5,
    borderColor: '#ffe0e0',
  },
  inputContainer: {
    marginBottom: 24,
  },
  // Inputs compactos y rápidos - diseño claro mejorado
  modernTextInput: {
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#212529',
    backgroundColor: '#ffffff',
  },
  singleLineTextInput: {
    height: 50,
  },
  multilineTextInput: {
    minHeight: 100,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  // Botones booleanos compactos - diseño claro mejorado
  modernBooleanContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modernBooleanButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  modernBooleanButtonSelected: {
    backgroundColor: '#619FF0',
    borderColor: '#619FF0',
  },
  modernBooleanButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6c757d',
  },
  modernBooleanButtonTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  // Select compacto - diseño claro mejorado
  modernSelectContainer: {
    gap: 10,
  },
  modernOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    backgroundColor: '#ffffff',
    minHeight: 50,
  },
  modernOptionButtonSelected: {
    backgroundColor: '#619FF0',
    borderColor: '#619FF0',
  },
  optionCheckIcon: {
    marginRight: 12,
  },
  modernOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#212529',
    fontWeight: '500',
  },
  modernOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  // Select button (para dropdowns) - Compacto - diseño claro mejorado
  modernSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    backgroundColor: '#ffffff',
    minHeight: 50,
    justifyContent: 'space-between',
  },
  modernSelectButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#212529',
    marginLeft: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#212529',
    fontWeight: '500',
  },
  // Photo container
  modernPhotoContainer: {
    gap: 14,
  },
  modernPhotoButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modernPhotoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#003459',
    backgroundColor: '#E6F2F7',
    gap: 10,
    minHeight: 52,
  },
  modernPhotoButtonDisabled: {
    opacity: 0.5,
  },
  modernPhotoButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#003459',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
  },
  uploadingText: {
    fontSize: 14,
    color: '#003459',
    fontWeight: '500',
  },
  photoRequirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoRequirement: {
    fontSize: 12,
    color: '#6c757d',
  },
  photoRequirementMet: {
    color: '#00C9A7',
    fontWeight: '500',
  },
  photoPreviewContainer: {
    gap: 10,
  },
  photoPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoCard: {
    width: 100,
    gap: 4,
  },
  photoCardImageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  photoCardImage: {
    width: '100%',
    height: '100%',
  },
  photoSyncBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoSyncBadgeSynced: {
    backgroundColor: '#00C9A7',
  },
  photoSyncBadgePending: {
    backgroundColor: '#adb5bd',
  },
  photoDeleteButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#dc3545',
    borderRadius: 14,
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCardDesc: {
    fontSize: 11,
    color: '#495057',
    fontWeight: '500',
    lineHeight: 14,
  },
  // Modal de descripción de foto
  descriptionModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  descriptionModalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 12,
  },
  descriptionModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#dee2e6',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  descriptionModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#003459',
    textAlign: 'center',
  },
  descriptionModalSubtitle: {
    fontSize: 13,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 18,
  },
  descriptionModalPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  descriptionInput: {
    borderWidth: 2,
    borderColor: '#003459',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#212529',
    backgroundColor: '#f8f9fa',
    marginTop: 4,
  },
  descriptionCharCount: {
    fontSize: 11,
    color: '#adb5bd',
    textAlign: 'right',
    marginTop: -6,
  },
  descriptionModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  descriptionCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6c757d',
  },
  descriptionConfirmButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#003459',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  descriptionConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Number input wrapper
  numberInputWrapper: {
    gap: 8,
  },
  rangeHint: {
    fontSize: 13,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 4,
  },
  // Signature compacto - diseño claro mejorado
  modernSignatureContainer: {
    gap: 12,
  },
  modernSignatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    backgroundColor: '#ffffff',
    gap: 10,
    minHeight: 50,
  },
  modernSignatureButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212529',
  },
  modernSignatureHelp: {
    fontSize: 12,
    color: '#6c757d',
    paddingHorizontal: 4,
    lineHeight: 16,
  },
  // Botón guardar - diseño mejorado según imagen
  modernSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: '#619FF0',
    gap: 12,
    marginTop: 16,
    shadowColor: '#619FF0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modernSaveButtonDisabled: {
    backgroundColor: '#6c757d',
    shadowOpacity: 0.1,
  },
  modernSaveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  completedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: '#d4edda',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  completedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#155724',
  },
  notImplementedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
    backgroundColor: '#fff9e6',
    gap: 8,
  },
  notImplementedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#856404',
  },
  unsupportedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
    backgroundColor: '#fff9e6',
    gap: 8,
  },
  unsupportedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#856404',
  },
  unsupportedSubtext: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
}); 