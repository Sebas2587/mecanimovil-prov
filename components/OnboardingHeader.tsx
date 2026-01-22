import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface OnboardingHeaderProps {
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  canGoBack?: boolean;
  backPath?: string;
  icon?: string;
}

export default function OnboardingHeader({
  title,
  subtitle,
  currentStep,
  totalSteps,
  canGoBack = true,
  backPath,
  icon
}: OnboardingHeaderProps) {
  const router = useRouter();

  const handleGoBack = () => {
    if (backPath) {
      router.push(backPath as any);
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      {/* Barra de progreso mejorada */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarWrapper}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(currentStep / totalSteps) * 100}%` }
              ]} 
            />
          </View>
        </View>
        <Text style={styles.progressText}>
          Paso {currentStep} de {totalSteps}
        </Text>
      </View>

      {/* Header con botón de retroceso mejorado */}
      <View style={styles.headerContainer}>
        {canGoBack && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleGoBack}
            activeOpacity={0.7}
          >
            <View style={styles.backButtonContent}>
              <Ionicons name="chevron-back" size={20} color="#4E4FEB" />
              <Text style={styles.backButtonText}>Anterior</Text>
            </View>
          </TouchableOpacity>
        )}
        
        <View style={styles.titleContainer}>
          {icon && (
            <View style={styles.iconContainer}>
              <Ionicons name={icon as any} size={32} color="#4E4FEB" />
            </View>
          )}
          <Text style={styles.title}>{title}</Text>
          {subtitle && (
            <View style={styles.subtitleContainer}>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBarWrapper: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#EEEEEE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4E4FEB',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  headerContainer: {
    position: 'relative',
  },
  backButton: {
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 15,
    color: '#4E4FEB',
    fontWeight: '600',
    marginLeft: 4,
  },
  titleContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E6F2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitleContainer: {
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
  },
}); 