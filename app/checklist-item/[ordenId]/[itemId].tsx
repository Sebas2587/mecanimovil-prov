import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useChecklist } from '@/hooks/useChecklist';
import { ChecklistItemRenderer } from '@/components/checklist/ChecklistItemRenderer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function ChecklistItemDetailScreen() {
  const { ordenId, itemId } = useLocalSearchParams<{ ordenId: string; itemId: string }>();
  const insets = useSafeAreaInsets();
  
  const ordenIdNum = parseInt(ordenId || '0', 10);
  const itemIdNum = parseInt(itemId || '0', 10);
  
  const {
    template,
    instance,
    loading,
    saving,
    saveResponse,
    takePicture,
    pickFromGallery,
    uploadPhoto,
    finalizeChecklist,
  } = useChecklist({ ordenId: ordenIdNum });

  const [item, setItem] = useState<any>(null);
  const [response, setResponse] = useState<any>(null);

  // Recargar datos cuando la pantalla recibe foco
  useFocusEffect(
    React.useCallback(() => {
      if (template && itemIdNum) {
        const foundItem = template.items?.find((i: any) => i.id === itemIdNum);
        setItem(foundItem);
        
        if (instance?.respuestas) {
          const foundResponse = instance.respuestas.find((r: any) => r.item_template === itemIdNum);
          setResponse(foundResponse);
        }
      }
    }, [template, instance, itemIdNum])
  );

  useEffect(() => {
    if (template && itemIdNum) {
      const foundItem = template.items?.find((i: any) => i.id === itemIdNum);
      setItem(foundItem);
      
      if (instance?.respuestas) {
        const foundResponse = instance.respuestas.find((r: any) => r.item_template === itemIdNum);
        setResponse(foundResponse);
      }
    }
  }, [template, instance, itemIdNum]);

  const handleSave = async (responseData: any) => {
    if (!item) return;
    
    const result = await saveResponse(item.id, responseData);
    
    if (result.success) {
      Alert.alert(
        'Guardado',
        'Tu respuesta ha sido guardada exitosamente.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      Alert.alert('Error', result.message || 'No se pudo guardar la respuesta');
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  if (loading || !template || !instance) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Cargando item del checklist...</Text>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={64} color="#dc3545" />
          <Text style={styles.errorTitle}>Item no encontrado</Text>
          <Text style={styles.errorMessage}>
            No se pudo encontrar el item del checklist solicitado.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.closeButton}>
          <MaterialIcons name="arrow-back" size={24} color="#212529" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {item.pregunta_texto}
          </Text>
          <Text style={styles.headerSubtitle}>
            Item {item.orden_visual || 'N/A'} de {template.items?.length || 0}
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.rendererWrapper}>
          <ChecklistItemRenderer
            item={item}
            response={response}
            onSave={handleSave}
            saving={saving}
            instance={instance}
            finalizeChecklist={finalizeChecklist}
            takePicture={takePicture}
            pickFromGallery={pickFromGallery}
            uploadPhoto={uploadPhoto}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  closeButton: {
    padding: 6,
    marginRight: 10,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6c757d',
  },
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    paddingTop: 8,
  },
  rendererWrapper: {
    paddingHorizontal: 20,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6c757d',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#619FF0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

