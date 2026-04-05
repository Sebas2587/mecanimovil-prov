import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  User, Mail, Phone, MapPin, ChevronRight, LogOut,
  Clock, Wrench, CreditCard, Settings, ShieldCheck,
  Building2, Map, Headphones, FileText, Edit3,
} from 'lucide-react-native';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import Header from '@/components/Header';

export default function PerfilScreen() {
  const {
    isLoading, estadoProveedor, usuario, logout,
    refrescarEstadoProveedor, obtenerNombreProveedor,
  } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const fotoProveedor = useMemo(() => {
    const fotoDesdeDatos = (estadoProveedor?.datos_proveedor as any)?.foto_perfil;
    if (fotoDesdeDatos) return fotoDesdeDatos;
    if (usuario?.foto_perfil) return usuario.foto_perfil;
    return null;
  }, [estadoProveedor?.datos_proveedor, usuario?.foto_perfil]);

  const esTaller = estadoProveedor?.tipo_proveedor === 'taller';
  const esMecanicoDomicilio = estadoProveedor?.tipo_proveedor === 'mecanico';

  const handleContactarSoporte = () => {
    const phoneNumber = '+56995945258';
    const message = 'Hola, soy proveedor de la app MecaniMóvil y tengo un problema con la aplicación, pagos o configuración.';
    const url = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url).then((supported) => {
      if (!supported) Alert.alert('Error', 'No se pudo abrir WhatsApp. Verifica que esté instalado.');
      else return Linking.openURL(url);
    }).catch(() => {});
  };

  const handleCerrarSesion = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar Sesión', style: 'destructive',
        onPress: async () => {
          try { setIsLoggingOut(true); await logout(); }
          catch { Alert.alert('Error', 'Hubo un problema al cerrar sesión.'); }
          finally { setIsLoggingOut(false); }
        },
      },
    ]);
  };

  const getEstadoColor = () => {
    if (estadoProveedor?.verificado) return '#10B981';
    switch (estadoProveedor?.estado_verificacion) {
      case 'pendiente': return '#F59E0B';
      case 'en_revision': return '#3B82F6';
      case 'rechazado': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  const getEstadoTexto = () => {
    if (estadoProveedor?.verificado) return 'Verificado';
    switch (estadoProveedor?.estado_verificacion) {
      case 'pendiente': return 'Pendiente de Revisión';
      case 'en_revision': return 'En Revisión';
      case 'rechazado': return 'Rechazado';
      default: return 'Sin Estado';
    }
  };

  type SettingItem = {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    onPress: () => void;
    iconBg: string;
  };

  const settingsItems: SettingItem[] = [
    { icon: <CreditCard size={20} color="#F59E0B" />, title: 'Suscripción', subtitle: 'Gestionar plan', onPress: () => router.push('/creditos'), iconBg: '#FFF7ED' },
    { icon: <Clock size={20} color="#3B82F6" />, title: 'Horarios', subtitle: 'Disponibilidad', onPress: () => router.push('/configuracion-horarios'), iconBg: '#EFF6FF' },
    { icon: <Wrench size={20} color="#8B5CF6" />, title: 'Especialidades', subtitle: 'Configurar marcas', onPress: () => router.push('/especialidades-marcas'), iconBg: '#F5F3FF' },
    { icon: <Settings size={20} color="#06B6D4" />, title: 'Mis Servicios', subtitle: 'Gestionar ofertas', onPress: () => router.push('/mis-servicios'), iconBg: '#ECFEFF' },
    { icon: <CreditCard size={20} color="#06B6D4" />, title: 'Mercado Pago', subtitle: 'Recibir pagos', onPress: () => router.push('/configuracion-mercadopago'), iconBg: '#ECFEFF' },
  ];

  if (esMecanicoDomicilio) {
    settingsItems.push({ icon: <Map size={20} color="#10B981" />, title: 'Zonas', subtitle: 'Cobertura', onPress: () => router.push('/zonas-servicio'), iconBg: '#ECFDF5' });
  } else if (esTaller) {
    settingsItems.push({ icon: <Building2 size={20} color="#3B82F6" />, title: 'Taller', subtitle: 'Gestionar info', onPress: () => router.push('/gestionar-taller'), iconBg: '#EFF6FF' });
  }

  settingsItems.push({ icon: <Headphones size={20} color="#F97316" />, title: 'Soporte', subtitle: 'Ayuda WhatsApp', onPress: handleContactarSoporte, iconBg: '#FFF7ED' });

  if (isLoading) {
    return (
      <TabScreenWrapper>
        <LinearGradient colors={['#F3F5F8', '#FAFBFC', '#FFFFFF']} locations={[0, 0.3, 1]} style={styles.gradient}>
          <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Cargando configuración...</Text>
          </View>
        </LinearGradient>
      </TabScreenWrapper>
    );
  }

  const infoItems = [
    { icon: <User size={18} color="#3B82F6" />, label: 'Usuario', value: usuario?.username ? `@${usuario.username}` : 'Sin usuario' },
    { icon: <Mail size={18} color="#3B82F6" />, label: 'Email', value: usuario?.email || 'Sin email' },
    ...(estadoProveedor?.datos_proveedor?.telefono ? [{ icon: <Phone size={18} color="#3B82F6" />, label: 'Teléfono', value: estadoProveedor.datos_proveedor.telefono }] : []),
    ...((estadoProveedor?.datos_proveedor as any)?.direccion_fisica?.direccion_completa || (estadoProveedor?.datos_proveedor as any)?.direccion
      ? [{ icon: <MapPin size={18} color="#3B82F6" />, label: 'Dirección', value: (estadoProveedor?.datos_proveedor as any)?.direccion_fisica?.direccion_completa || (estadoProveedor?.datos_proveedor as any)?.direccion }]
      : []),
  ];

  return (
    <TabScreenWrapper>
      <LinearGradient colors={['#F3F5F8', '#FAFBFC', '#FFFFFF']} locations={[0, 0.3, 1]} style={styles.gradient}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header
          title="Configuración"
          rightComponent={
            <TouchableOpacity onPress={() => router.push('/configuracion-perfil')} style={styles.editBtn} activeOpacity={0.7}>
              <Edit3 size={20} color="#3B82F6" />
            </TouchableOpacity>
          }
        />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Profile Card */}
          <View style={styles.profileCardOuter}>
            <BlurView intensity={50} tint="light" style={styles.profileCardInner}>
              <View style={styles.avatarWrap}>
                {fotoProveedor ? (
                  <Image source={{ uri: fotoProveedor }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <User size={36} color="#9CA3AF" />
                  </View>
                )}
              </View>
              <Text style={styles.profileName}>{obtenerNombreProveedor() || 'Proveedor'}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: getEstadoColor() }]} />
                <Text style={styles.statusLabel}>{getEstadoTexto()}</Text>
              </View>
            </BlurView>
          </View>

          {/* Personal Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información Personal</Text>
            <View style={styles.infoCardOuter}>
              <BlurView intensity={40} tint="light" style={styles.infoCardInner}>
                {infoItems.map((item, index) => (
                  <View key={index} style={[styles.infoRow, index < infoItems.length - 1 && styles.infoRowBorder]}>
                    <View style={styles.infoIconWrap}>{item.icon}</View>
                    <View style={styles.infoTextWrap}>
                      <Text style={styles.infoLabel}>{item.label}</Text>
                      <Text style={styles.infoValue} numberOfLines={2}>{item.value}</Text>
                    </View>
                  </View>
                ))}
              </BlurView>
            </View>
          </View>

          {/* Settings Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configuración</Text>
            <View style={styles.settingsGrid}>
              {settingsItems.map((item, index) => (
                <TouchableOpacity key={index} style={styles.settingCardOuter} onPress={item.onPress} activeOpacity={0.7}>
                  <BlurView intensity={40} tint="light" style={styles.settingCardInner}>
                    <View style={styles.settingCardRow}>
                      <View style={[styles.settingIconWrap, { backgroundColor: item.iconBg }]}>
                        {item.icon}
                      </View>
                      <View style={styles.settingTextWrap}>
                        <Text style={styles.settingTitle}>{item.title}</Text>
                        <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                      </View>
                      <ChevronRight size={18} color="#D1D5DB" />
                    </View>
                  </BlurView>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={[styles.logoutBtn, isLoggingOut && { opacity: 0.5 }]}
              onPress={handleCerrarSesion}
              disabled={isLoggingOut}
              activeOpacity={0.7}
            >
              <LogOut size={18} color="#EF4444" />
              <Text style={styles.logoutText}>{isLoggingOut ? 'Cerrando...' : 'Cerrar Sesión'}</Text>
              {isLoggingOut && <ActivityIndicator size="small" color="#EF4444" style={{ marginLeft: 8 }} />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.privacyBtn} onPress={handleContactarSoporte}>
              <FileText size={14} color="#9CA3AF" />
              <Text style={styles.privacyText}>Privacidad y Política</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </LinearGradient>
    </TabScreenWrapper>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  centeredContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  editBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(59,130,246,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Profile Card
  profileCardOuter: {
    marginHorizontal: 18, marginTop: 8, marginBottom: 20,
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  profileCardInner: {
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  avatarWrap: { marginBottom: 14 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6,
  },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#F3F4F6', borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  profileName: { fontSize: 22, fontWeight: '700', color: '#1F2937', marginBottom: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 14, fontWeight: '500', color: '#6B7280' },

  // Section
  section: { marginBottom: 20, paddingHorizontal: 18 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 12 },

  // Info Card
  infoCardOuter: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  infoCardInner: { backgroundColor: 'rgba(255,255,255,0.55)' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(59,130,246,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  infoTextWrap: { flex: 1 },
  infoLabel: { fontSize: 12, fontWeight: '500', color: '#9CA3AF', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#1F2937' },

  // Settings Grid
  settingsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  settingCardOuter: {
    width: '48.5%', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  settingCardInner: {
    paddingVertical: 14, paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  settingCardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingTextWrap: { flex: 1 },
  settingTitle: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  settingSubtitle: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  // Bottom
  bottomActions: {
    paddingHorizontal: 18, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoutText: { fontSize: 14, fontWeight: '500', color: '#EF4444' },
  privacyBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  privacyText: { fontSize: 12, fontWeight: '500', color: '#9CA3AF' },
});
