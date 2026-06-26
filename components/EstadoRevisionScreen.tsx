import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { EstadoProveedor, onboardingAPI } from '@/services/api';
import { useRouter } from 'expo-router';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { showAlert, showAlertButtons, showConfirm } from '@/utils/platformAlert';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import {
  institutionalCardStyles,
  institutionalStatusColors,
  type InstitutionalStatusTone,
} from '@/app/design-system/styles/institutionalSemantic';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';

const I = COLORS.institutional;

interface EstadoRevisionScreenProps {
  estadoProveedor: EstadoProveedor;
}

function estadoTone(estado: EstadoProveedor['estado_verificacion']): InstitutionalStatusTone {
  switch (estado) {
    case 'pendiente':
      return 'warning';
    case 'en_revision':
      return 'info';
    case 'rechazado':
      return 'error';
    default:
      return 'neutral';
  }
}

function getIconoEstado(estado: EstadoProveedor['estado_verificacion']) {
  switch (estado) {
    case 'pendiente':
      return 'pending';
    case 'en_revision':
      return 'search';
    case 'rechazado':
      return 'error';
    default:
      return 'help';
  }
}

function getMensajeEstado(estado: EstadoProveedor['estado_verificacion']) {
  switch (estado) {
    case 'pendiente':
      return 'Tu perfil está pendiente de revisión por nuestro equipo. Te notificaremos cuando hayamos revisado tu información.';
    case 'en_revision':
      return 'Nuestro equipo está revisando tu información. Este proceso puede tomar de 1 a 3 días hábiles.';
    case 'rechazado':
      return 'Tu perfil necesita correcciones. Por favor contacta a soporte para más información sobre los ajustes necesarios.';
    default:
      return 'Estado de verificación desconocido.';
  }
}

function getTituloEstado(estado: EstadoProveedor['estado_verificacion']) {
  switch (estado) {
    case 'pendiente':
      return 'Perfil Pendiente de Revisión';
    case 'en_revision':
      return 'Perfil en Revisión';
    case 'rechazado':
      return 'Perfil Rechazado';
    default:
      return 'Estado Desconocido';
  }
}

export default function EstadoRevisionScreen({ estadoProveedor }: EstadoRevisionScreenProps) {
  const { logout, refrescarEstadoProveedor } = useAuth();
  const router = useRouter();

  const status = institutionalStatusColors(estadoTone(estadoProveedor.estado_verificacion));
  const successStatus = institutionalStatusColors('success');
  const errorStatus = institutionalStatusColors('error');

  const handleContactarSoporte = () => {
    Alert.alert(
      'Contactar Soporte',
      'Para contactar a nuestro equipo de soporte, envía un email a soporte@mecanimovil.com o llama al +56 9 1234 5678',
      [{ text: 'Entendido', style: 'default' }]
    );
  };

  const handleActualizarEstado = async () => {
    try {
      await refrescarEstadoProveedor();
      Alert.alert('Estado Actualizado', 'Se ha actualizado el estado de tu perfil.');
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el estado. Intenta nuevamente.');
    }
  };

  const handleCerrarSesion = () => {
    showConfirm('Cerrar Sesión', '¿Estás seguro de que deseas cerrar sesión?', {
      confirmText: 'Cerrar Sesión',
      onConfirm: logout,
    });
  };

  const handleCompletarDocumentos = async () => {
    try {
      const data = await onboardingAPI.completarOnboardingDocumentos();

      if (data.puede_subir_documentos) {
        showAlertButtons(
          'Completar documentos',
          data.mensaje_verificacion ||
            'Ahora puedes subir tus documentos para completar tu verificación.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Subir documentos',
              onPress: () => router.push('/(onboarding)/subir-documentos'),
            },
          ],
        );
      } else {
        showAlert(
          'Documentos ya subidos',
          data.mensaje_verificacion ||
            'Ya tienes documentos en revisión. Te notificaremos cuando sean aprobados.',
        );
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const detalle =
        err.response?.data?.error || err.message || 'No se pudo procesar la solicitud.';
      showAlert('Error', `${detalle} Intenta nuevamente.`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: status.bg }]}>
              <InstitutionalIcon
                name={getIconoEstado(estadoProveedor.estado_verificacion) as any}
                size={50}
                color={status.icon}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            </View>
            <InstitutionalText role="h2" color="ink" style={styles.titulo}>
              {getTituloEstado(estadoProveedor.estado_verificacion)}
            </InstitutionalText>
            <InstitutionalText role="body" color="body" style={styles.mensaje}>
              {getMensajeEstado(estadoProveedor.estado_verificacion)}
            </InstitutionalText>
          </View>

          <View style={[institutionalCardStyles.surface, institutionalCardStyles.surfacePadding, styles.section]}>
            <InstitutionalSectionHeader title="Información de tu Perfil" level="h4" style={styles.sectionHeader} />

            <View style={styles.infoRow}>
              <InstitutionalText role="caption" color="body">Tipo de Proveedor:</InstitutionalText>
              <InstitutionalText role="captionBold" color="ink" style={styles.infoValue}>
                {estadoProveedor.tipo_proveedor === 'taller' ? 'Taller Mecánico' : 'Mecánico a Domicilio'}
              </InstitutionalText>
            </View>

            {estadoProveedor.nombre ? (
              <View style={styles.infoRow}>
                <InstitutionalText role="caption" color="body">Nombre:</InstitutionalText>
                <InstitutionalText role="captionBold" color="ink" style={styles.infoValue}>
                  {estadoProveedor.nombre}
                </InstitutionalText>
              </View>
            ) : null}

            <View style={styles.infoRow}>
              <InstitutionalText role="caption" color="body">Fecha de Registro:</InstitutionalText>
              <InstitutionalText role="captionBold" color="ink" style={styles.infoValue}>
                {estadoProveedor.fecha_registro
                  ? new Date(estadoProveedor.fecha_registro).toLocaleDateString('es-CL')
                  : 'No disponible'}
              </InstitutionalText>
            </View>

            <View style={styles.infoRow}>
              <InstitutionalText role="caption" color="body">Onboarding Completado:</InstitutionalText>
              <InstitutionalText
                role="captionBold"
                color={
                  estadoProveedor.onboarding_completado ? successStatus.text : errorStatus.text
                }
                style={styles.infoValue}
              >
                {estadoProveedor.onboarding_completado ? 'Sí' : 'No'}
              </InstitutionalText>
            </View>
          </View>

          <View style={styles.actionsSection}>
            <InstitutionalButton
              label="Actualizar Estado"
              variant="outlineAccent"
              onPress={handleActualizarEstado}
              leading={
                <InstitutionalIcon name="refresh" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              }
              style={styles.actionBtn}
            />
            <InstitutionalButton
              label="Completar Documentos"
              variant="outlineAccent"
              onPress={handleCompletarDocumentos}
              leading={
                <InstitutionalIcon name="upload-file" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              }
              style={styles.actionBtn}
            />
            <InstitutionalButton
              label="Contactar Soporte"
              variant="outlineAccent"
              onPress={handleContactarSoporte}
              leading={
                <InstitutionalIcon name="support" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              }
              style={styles.actionBtn}
            />
            <InstitutionalButton
              label="Cerrar Sesión"
              variant="destructiveOutline"
              onPress={handleCerrarSesion}
              leading={
                <InstitutionalIcon name="logout" size={20} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
              }
              style={styles.actionBtn}
            />
          </View>

          <View style={[institutionalCardStyles.surface, institutionalCardStyles.surfacePadding]}>
            <InstitutionalSectionHeader title="¿Qué sigue?" level="h4" style={styles.sectionHeader} />
            <InstitutionalText role="caption" color="body" style={styles.infoText}>
              Una vez que tu perfil sea aprobado, podrás:
            </InstitutionalText>
            <View style={styles.benefitsList}>
              <InstitutionalText role="caption" color="semanticUp" style={styles.benefitItem}>
                ✓ Recibir solicitudes de servicio
              </InstitutionalText>
              <InstitutionalText role="caption" color="semanticUp" style={styles.benefitItem}>
                ✓ Aparecer en la búsqueda de clientes
              </InstitutionalText>
              <InstitutionalText role="caption" color="semanticUp" style={styles.benefitItem}>
                ✓ Gestionar tu agenda de trabajo
              </InstitutionalText>
              <InstitutionalText role="caption" color="semanticUp" style={styles.benefitItem}>
                ✓ Acceder a todas las funcionalidades de la plataforma
              </InstitutionalText>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.fixed.lg,
  },
  content: {
    padding: SPACING.fixed.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.fixed.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.fixed.lg,
  },
  titulo: {
    textAlign: 'center',
    marginBottom: SPACING.fixed.sm,
  },
  mensaje: {
    textAlign: 'center',
  },
  section: {
    marginBottom: SPACING.fixed.lg,
  },
  sectionHeader: {
    marginBottom: SPACING.fixed.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.fixed.sm,
    gap: SPACING.fixed.sm,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
  },
  actionsSection: {
    marginBottom: SPACING.fixed.lg,
    gap: SPACING.fixed.sm,
  },
  actionBtn: {
    alignSelf: 'stretch',
  },
  infoText: {
    marginBottom: SPACING.fixed.md,
  },
  benefitsList: {
    marginTop: SPACING.fixed.xxs,
    gap: SPACING.fixed.xs,
  },
  benefitItem: {
    lineHeight: 20,
  },
});
