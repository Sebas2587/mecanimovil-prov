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
  onSave: (responseData: any) => Promise<void>;
  saving: boolean;
  instance: ChecklistInstance;
  finalizeChecklist: (data: any) => Promise<any>;
  takePicture?: () => Promise<any>;
  pickFromGallery?: () => Promise<any>;
  uploadPhoto?: (photoUri: string, responseId: number, descripcion?: string) => Promise<any>;
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
}) => {
  const [inputValue, setInputValue] = useState<any>('');
  const [isModified, setIsModified] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

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
    if (result.success) {
      await handlePhotoSelected(result.data);
    }
  };

  // Función para seleccionar de galería
  const handlePickFromGallery = async () => {
    if (!pickFromGallery) {
      Alert.alert('Error', 'Función de galería no disponible');
      return;
    }

    const result = await pickFromGallery();
    if (result.success) {
      await handlePhotoSelected(result.data);
    }
  };

  // Manejar foto seleccionada (cámara o galería)
  const handlePhotoSelected = async (photoData: any) => {
    if (!photoData) return;

    setUploadingPhoto(true);

    try {
      console.log('📸 Procesando nueva foto:', photoData);

      // Agregar foto a la lista local
      const updatedPhotos = [...photos, {
        uri: photoData.uri,
        descripcion: `Foto ${photos.length + 1}`,
        orden_en_respuesta: photos.length + 1,
        sincronizada: false,
        fecha_captura: new Date().toISOString(),
      }];

      setPhotos(updatedPhotos);
      console.log('📝 Fotos actualizadas localmente:', updatedPhotos.length);

      // Intentar subir la foto si tenemos ID de respuesta
      if (response?.id && uploadPhoto) {
        try {
          console.log('☁️ Subiendo foto al servidor...');
          const uploadResult = await uploadPhoto(photoData.uri, response.id);

          if (uploadResult.success) {
            console.log('✅ Foto subida exitosamente');
            // Marcar la foto como sincronizada
            const syncedPhotos = updatedPhotos.map(photo =>
              photo.uri === photoData.uri
                ? { ...photo, sincronizada: true, id: uploadResult.data?.id }
                : photo
            );
            setPhotos(syncedPhotos);
          } else {
            console.log('⚠️ Error subiendo foto, se guardará para sincronizar después');
          }
        } catch (uploadError) {
          console.log('⚠️ Error en subida de foto, se guardará offline:', uploadError);
        }
      }

      // Marcar como completado si cumple requisitos mínimos
      const isComplete = updatedPhotos.length >= (item.min_fotos || 1);
      await onSave({
        completado: isComplete,
        respuesta_texto: `${updatedPhotos.length} foto(s) capturada(s)`
      });

      console.log('🎯 Foto procesada completamente, completado:', isComplete);

    } catch (error) {
      console.error('❌ Error procesando foto:', error);
      Alert.alert('Error', 'No se pudo procesar la foto');
    } finally {
      setUploadingPhoto(false);
    }
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

  // Renderizar opciones de selección - Minimalista
  const renderSelectOptions = () => {
    if (!item.opciones_seleccion) return null;

    const isSelected = (opcion: any) => {
      if (item.tipo_pregunta === 'SELECT') {
        return inputValue === opcion;
      } else if (item.tipo_pregunta === 'MULTISELECT' || item.tipo_pregunta.includes('SELECT')) {
        const currentValues = Array.isArray(inputValue) ? inputValue : [];
        return currentValues.includes(opcion);
      }
      return false;
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
            if (item.tipo_pregunta === 'SELECT') {
              handleInputChange(opcion);
            } else {
              // MULTISELECT
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
        <Text style={styles.photoPreviewTitle}>Fotos capturadas:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoPreviewItem}>
              <Image source={{ uri: photo.uri }} style={styles.photoPreviewImage} />
              <TouchableOpacity
                style={styles.photoDeleteButton}
                onPress={() => {
                  const newPhotos = photos.filter((_, i) => i !== index);
                  setPhotos(newPhotos);
                  setIsModified(true);
                }}
              >
                <MaterialIcons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
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
            <View style={styles.modernPhotoButtonsContainer}>
              <TouchableOpacity
                style={styles.modernPhotoButton}
                onPress={handleTakePicture}
                disabled={uploadingPhoto}
              >
                <MaterialIcons name="camera-alt" size={22} color="#007bff" />
                <Text style={styles.modernPhotoButtonText}>Tomar Foto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modernPhotoButton}
                onPress={handlePickFromGallery}
                disabled={uploadingPhoto}
              >
                <MaterialIcons name="photo-library" size={22} color="#007bff" />
                <Text style={styles.modernPhotoButtonText}>Galería</Text>
              </TouchableOpacity>
            </View>

            {uploadingPhoto && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color="#619FF0" />
                <Text style={styles.uploadingText}>Procesando foto...</Text>
              </View>
            )}

            {renderPhotoPreview()}

            {item.min_fotos && photos.length < item.min_fotos && (
              <Text style={styles.photoRequirement}>
                Mínimo {item.min_fotos} foto(s) requerida(s)
              </Text>
            )}
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

        {/* FOTOS */}
        {item.tipo_pregunta === 'PHOTO' && (
          <View style={styles.modernPhotoContainer}>
            <View style={styles.modernPhotoButtonsContainer}>
              <TouchableOpacity
                style={styles.modernPhotoButton}
                onPress={handleTakePicture}
                disabled={uploadingPhoto}
              >
                <MaterialIcons name="camera-alt" size={22} color="#007bff" />
                <Text style={styles.modernPhotoButtonText}>Tomar Foto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modernPhotoButton}
                onPress={handlePickFromGallery}
                disabled={uploadingPhoto}
              >
                <MaterialIcons name="photo-library" size={22} color="#007bff" />
                <Text style={styles.modernPhotoButtonText}>Galería</Text>
              </TouchableOpacity>
            </View>

            {uploadingPhoto && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color="#619FF0" />
                <Text style={styles.uploadingText}>Procesando foto...</Text>
              </View>
            )}

            {renderPhotoPreview()}

            {item.min_fotos && photos.length < item.min_fotos && (
              <Text style={styles.photoRequirement}>
                Mínimo {item.min_fotos} foto(s) requerida(s)
              </Text>
            )}
          </View>
        )}

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
        {!['TEXT', 'NUMBER', 'KILOMETER_INPUT', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'RATING', 'PHOTO', 'DATETIME', 'LOCATION', 'SIGNATURE'].includes(item.tipo_pregunta) && (
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
  // Photo container compacto - diseño claro mejorado
  modernPhotoContainer: {
    gap: 16,
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
    borderColor: '#dee2e6',
    backgroundColor: '#ffffff',
    gap: 10,
    minHeight: 50,
  },
  modernPhotoButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212529',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  uploadingText: {
    fontSize: 14,
    color: '#6c757d',
  },
  photoPreviewContainer: {
    gap: 8,
  },
  photoPreviewTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
  },
  photoPreviewItem: {
    position: 'relative',
    marginRight: 8,
  },
  photoPreviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  photoDeleteButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#dc3545',
    borderRadius: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoRequirement: {
    fontSize: 12,
    color: '#dc3545',
    fontStyle: 'italic',
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