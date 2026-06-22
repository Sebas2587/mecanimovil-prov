import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Switch,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { navigateBack } from '@/utils/navigateBack';
import equipoTallerService, {
  type MiembroTaller,
  type ModalidadTecnico,
  type RolMiembro,
  type CrearMiembroData,
  type PermisosSupervisor,
} from '@/services/equipoTallerService';
import { especialidadesAPI, type CategoriaServicio } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { InstitutionalScreenTabs } from '@/app/design-system/components/InstitutionalScreenTabs';
import { RendimientoEquipoTab } from '@/components/equipo/RendimientoEquipoTab';

type TabEquipo = 'equipo' | 'rendimiento';

const INST = COLORS.institutional;
const I = {
  primary: INST.primary,
  white: INST.onPrimary,
  text: INST.ink,
  muted: INST.muted,
  background: INST.surfaceSoft,
  danger: INST.semanticDown,
};
const FF = {
  regular: TYPOGRAPHY.fontFamily.regular,
  semibold: TYPOGRAPHY.fontFamily.sansSemiBold,
  bold: TYPOGRAPHY.fontFamily.bold,
};
const hx = SPACING.container.horizontal;

const MODALIDADES: { value: ModalidadTecnico; label: string }[] = [
  { value: 'en_taller', label: 'En taller' },
  { value: 'a_domicilio', label: 'A domicilio' },
  { value: 'ambas', label: 'Ambas' },
];

// Permisos que el mandante puede otorgar al supervisor (manage = crear/editar/eliminar).
const PERMISOS_OPCIONES: { key: keyof PermisosSupervisor; label: string; descripcion: string }[] = [
  { key: 'servicios', label: 'Servicios', descripcion: 'Crear, editar y eliminar servicios' },
  { key: 'mecanicos', label: 'Mecánicos', descripcion: 'Agregar, editar, habilitar y eliminar mecánicos' },
  { key: 'horarios', label: 'Horarios', descripcion: 'Configurar horarios del taller y de cada mecánico' },
  { key: 'agenda', label: 'Agenda y órdenes', descripcion: 'Gestionar la agenda y asignar mecánicos a las órdenes' },
  { key: 'zonas_cobertura', label: 'Zonas de cobertura', descripcion: 'Definir zonas (solo si atienden a domicilio)' },
  { key: 'finanzas', label: 'Finanzas y créditos', descripcion: 'Ver finanzas y consumir créditos (no comprar)' },
];

const DEFAULT_PERMISOS: PermisosSupervisor = {
  servicios: true,
  mecanicos: true,
  horarios: true,
  agenda: true,
  zonas_cobertura: true,
  finanzas: true,
};

type FormState = {
  id: number | null;
  rol: RolMiembro;
  nombre: string;
  especialidades: number[];
  modalidad_tecnico: ModalidadTecnico;
  username: string;
  password: string;
  email: string;
  tieneAcceso: boolean;
  permisos: PermisosSupervisor;
  fotoUri: string | null;
  fotoUrlExistente: string | null;
};

const EMPTY_FORM: FormState = {
  id: null,
  rol: 'mecanico',
  nombre: '',
  especialidades: [],
  modalidad_tecnico: 'en_taller',
  username: '',
  password: '',
  email: '',
  tieneAcceso: false,
  permisos: { ...DEFAULT_PERMISOS },
  fotoUri: null,
  fotoUrlExistente: null,
};

export default function GestionEquipoScreen() {
  const { esSupervisor, puede } = useAuth();
  const [tabActiva, setTabActiva] = useState<TabEquipo>('equipo');
  const [miembros, setMiembros] = useState<MiembroTaller[]>([]);
  const [categorias, setCategorias] = useState<CategoriaServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const cargar = useCallback(async () => {
    try {
      const [equipo, cats] = await Promise.all([
        equipoTallerService.listar(),
        especialidadesAPI.obtenerCategorias().catch(() => []),
      ]);
      setMiembros(equipo);
      setCategorias(cats);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el equipo del taller.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cargar();
  }, [cargar]);

  const mecanicos = useMemo(() => miembros.filter((m) => m.rol === 'mecanico'), [miembros]);
  const supervisor = useMemo(() => miembros.find((m) => m.rol === 'supervisor') || null, [miembros]);

  const abrirCrearMecanico = () => {
    setForm({ ...EMPTY_FORM, rol: 'mecanico' });
    setModalVisible(true);
  };

  const abrirCrearSupervisor = () => {
    setForm({ ...EMPTY_FORM, rol: 'supervisor', permisos: { ...DEFAULT_PERMISOS } });
    setModalVisible(true);
  };

  const abrirEditar = (m: MiembroTaller) => {
    // El supervisor no puede editar mandante ni supervisor (solo mecánicos).
    if (esSupervisor && m.rol !== 'mecanico') {
      return;
    }
    setForm({
      id: m.id,
      rol: m.rol,
      nombre: m.nombre,
      especialidades: m.especialidades || [],
      modalidad_tecnico: m.modalidad_tecnico,
      username: m.usuario_username || '',
      password: '',
      email: m.usuario_email || '',
      tieneAcceso: Boolean(m.tiene_acceso),
      permisos: { ...DEFAULT_PERMISOS, ...(m.permisos || {}) },
      fotoUri: null,
      fotoUrlExistente: m.foto_url || null,
    });
    setModalVisible(true);
  };

  const togglePermiso = (key: keyof PermisosSupervisor) => {
    setForm((prev) => ({
      ...prev,
      permisos: { ...prev.permisos, [key]: !prev.permisos[key] },
    }));
  };

  const toggleEspecialidad = (id: number) => {
    setForm((prev) => ({
      ...prev,
      especialidades: prev.especialidades.includes(id)
        ? prev.especialidades.filter((e) => e !== id)
        : [...prev.especialidades, id],
    }));
  };

  const seleccionarFotoMecanico = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para subir la imagen del mecánico.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setForm((prev) => ({
          ...prev,
          fotoUri: asset.uri,
          fotoUrlExistente: null,
        }));
      }
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar la foto.');
    }
  };

  const guardar = async () => {
    if (!form.nombre.trim()) {
      Alert.alert('Falta el nombre', 'Ingresa el nombre del miembro.');
      return;
    }
    if (form.rol === 'mecanico' && form.especialidades.length === 0) {
      Alert.alert('Falta especialidad', 'Un mecánico debe tener al menos una especialidad.');
      return;
    }
    if (form.rol === 'supervisor') {
      const creandoAcceso = !form.tieneAcceso;
      if (creandoAcceso && (!form.username.trim() || !form.password.trim())) {
        Alert.alert(
          'Faltan credenciales',
          'El supervisor necesita un usuario y una contraseña para iniciar sesión.',
        );
        return;
      }
    }
    setSaving(true);
    try {
      const payload: CrearMiembroData = {
        rol: form.rol,
        nombre: form.nombre.trim(),
        especialidades: form.especialidades,
        modalidad_tecnico: form.modalidad_tecnico,
      };
      if (form.rol === 'supervisor') {
        payload.permisos = form.permisos;
        if (form.email.trim()) payload.email = form.email.trim();
        // Credenciales: en alta siempre; en edición, solo si se ingresan.
        if (!form.tieneAcceso && form.username.trim()) payload.username = form.username.trim();
        if (form.password.trim()) payload.password = form.password.trim();
      }
      let miembroId = form.id;
      if (form.id) {
        await equipoTallerService.actualizar(form.id, payload);
      } else {
        const creado = await equipoTallerService.crear(payload);
        miembroId = creado.id;
      }
      if (form.rol === 'mecanico' && form.fotoUri && miembroId) {
        await equipoTallerService.subirFoto(miembroId, {
          uri: form.fotoUri,
          type: 'image/jpeg',
          name: `mecanico_${miembroId}.jpg`,
        });
      }
      setModalVisible(false);
      await cargar();
    } catch (error: any) {
      const data = error?.response?.data;
      const detalle =
        data?.username?.[0] ||
        data?.email?.[0] ||
        data?.rol?.[0] ||
        data?.especialidades?.[0] ||
        data?.detail ||
        'No se pudo guardar el miembro.';
      Alert.alert('Error', String(detalle));
    } finally {
      setSaving(false);
    }
  };

  const confirmarEliminar = (m: MiembroTaller) => {
    Alert.alert('Eliminar', `¿Eliminar a ${m.nombre} del equipo?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await equipoTallerService.eliminar(m.id);
            await cargar();
          } catch {
            Alert.alert('Error', 'No se pudo eliminar.');
          }
        },
      },
    ]);
  };

  const toggleActivo = async (m: MiembroTaller) => {
    try {
      await equipoTallerService.toggleActivo(m);
      await cargar();
    } catch {
      Alert.alert('Error', 'No se pudo cambiar el estado del mecánico.');
    }
  };

  const renderMecanico = (m: MiembroTaller) => (
    <View key={m.id} style={[styles.card, !m.activo && styles.cardInactiva]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {m.foto_url ? (
            <Image source={{ uri: m.foto_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <InstitutionalIcon name="person" size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
          )}
          <View style={{ marginLeft: SPACING.sm, flex: 1 }}>
            <Text style={styles.cardTitle}>{m.nombre}</Text>
            <Text style={styles.cardSubtitle}>
              {m.modalidad_tecnico_display}
              {!m.activo ? ' · Deshabilitado' : ''}
            </Text>
          </View>
        </View>
        <Switch value={m.activo} onValueChange={() => toggleActivo(m)} />
      </View>

      {m.especialidades_detalle?.length > 0 && (
        <View style={styles.chipsRow}>
          {m.especialidades_detalle.map((e) => (
            <View key={e.id} style={styles.chipReadonly}>
              <Text style={styles.chipReadonlyText}>{e.nombre}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => abrirEditar(m)}>
          <InstitutionalIcon name="create" size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.actionBtnText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => confirmarEliminar(m)}>
          <InstitutionalIcon name="trash" size={18} color={I.danger} strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={[styles.actionBtnText, { color: I.danger }]}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Gestión de Equipo" showBack onBackPress={() => navigateBack('/(tabs)')} />

      <View style={styles.tabsWrap}>
        <InstitutionalScreenTabs<TabEquipo>
          tabs={[
            { key: 'equipo', label: 'Equipo' },
            { key: 'rendimiento', label: 'Rendimiento' },
          ]}
          activeKey={tabActiva}
          onChange={setTabActiva}
        />
      </View>

      {tabActiva === 'rendimiento' ? (
        <RendimientoEquipoTab />
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={I.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Supervisor: solo el mandante designa, edita credenciales y permisos */}
          {!esSupervisor && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Supervisor</Text>
              </View>
              {supervisor ? (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <InstitutionalIcon name="shield-checkmark" size={22} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                      <View style={{ marginLeft: SPACING.sm, flex: 1 }}>
                        <Text style={styles.cardTitle}>{supervisor.nombre}</Text>
                        <Text style={styles.cardSubtitle}>
                          {supervisor.tiene_acceso && supervisor.usuario_username
                            ? `Inicia sesión como @${supervisor.usuario_username}`
                            : 'Sin acceso configurado'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardActionsInline}>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => abrirEditar(supervisor)}>
                        <InstitutionalIcon name="create" size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => confirmarEliminar(supervisor)}>
                        <InstitutionalIcon name="trash" size={18} color={I.danger} strokeWidth={ICON_STROKE_WIDTH} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.chipsRow}>
                    {PERMISOS_OPCIONES.filter((o) => supervisor.permisos?.[o.key]).map((o) => (
                      <View key={o.key} style={styles.chipReadonly}>
                        <Text style={styles.chipReadonlyText}>{o.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.addInline} onPress={abrirCrearSupervisor}>
                  <InstitutionalIcon name="add-circle" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.addInlineText}>Designar supervisor</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Mecánicos */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Mecánicos ({mecanicos.length})</Text>
            {(!esSupervisor || puede('mecanicos')) && (
              <TouchableOpacity style={styles.addBtn} onPress={abrirCrearMecanico}>
                <InstitutionalIcon name="add" size={18} color={I.white} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.addBtnText}>Agregar</Text>
              </TouchableOpacity>
            )}
          </View>

          {esSupervisor && !puede('mecanicos') ? (
            <Text style={styles.emptyText}>
              No tienes permiso para gestionar mecánicos. Contacta al dueño del taller.
            </Text>
          ) : mecanicos.length === 0 ? (
            <Text style={styles.emptyText}>
              Aún no tienes mecánicos. Agrega uno para asignar servicios automáticamente.
            </Text>
          ) : (
            mecanicos.map(renderMecanico)
          )}
        </ScrollView>
      )}

      {/* Modal de formulario */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {form.id ? 'Editar' : 'Agregar'} {form.rol === 'supervisor' ? 'supervisor' : 'mecánico'}
            </Text>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={form.nombre}
                onChangeText={(t) => setForm((p) => ({ ...p, nombre: t }))}
                placeholder="Nombre del miembro"
                placeholderTextColor={I.muted}
              />

              {form.rol === 'supervisor' && (
                <>
                  <Text style={styles.sectionMini}>Acceso del supervisor</Text>
                  <Text style={styles.helperText}>
                    {form.tieneAcceso
                      ? 'Este supervisor ya tiene acceso. Cambia la contraseña solo si quieres reemplazarla.'
                      : 'Crea un usuario y contraseña para que el supervisor inicie sesión.'}
                  </Text>

                  <Text style={styles.label}>Usuario</Text>
                  <TextInput
                    style={[styles.input, form.tieneAcceso && styles.inputDisabled]}
                    value={form.username}
                    onChangeText={(t) => setForm((p) => ({ ...p, username: t }))}
                    placeholder="usuario.supervisor"
                    placeholderTextColor={I.muted}
                    autoCapitalize="none"
                    editable={!form.tieneAcceso}
                  />

                  <Text style={styles.label}>Correo (opcional)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.email}
                    onChangeText={(t) => setForm((p) => ({ ...p, email: t }))}
                    placeholder="correo@ejemplo.com"
                    placeholderTextColor={I.muted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />

                  <Text style={styles.label}>{form.tieneAcceso ? 'Nueva contraseña' : 'Contraseña'}</Text>
                  <TextInput
                    style={styles.input}
                    value={form.password}
                    onChangeText={(t) => setForm((p) => ({ ...p, password: t }))}
                    placeholder={form.tieneAcceso ? 'Dejar en blanco para no cambiar' : 'Contraseña de acceso'}
                    placeholderTextColor={I.muted}
                    secureTextEntry
                    autoCapitalize="none"
                  />

                  <Text style={styles.sectionMini}>Permisos</Text>
                  <Text style={styles.helperText}>
                    Elige qué puede gestionar. No tendrá acceso a suscripción, Mercado Pago ni al perfil del taller.
                  </Text>
                  {PERMISOS_OPCIONES.map((opcion) => (
                    <View key={opcion.key} style={styles.permRow}>
                      <View style={{ flex: 1, paddingRight: SPACING.sm }}>
                        <Text style={styles.permLabel}>{opcion.label}</Text>
                        <Text style={styles.permDesc}>{opcion.descripcion}</Text>
                      </View>
                      <Switch
                        value={Boolean(form.permisos[opcion.key])}
                        onValueChange={() => togglePermiso(opcion.key)}
                      />
                    </View>
                  ))}
                </>
              )}

              {form.rol === 'mecanico' && (
                <>
                  <Text style={styles.label}>Foto de perfil</Text>
                  <View style={styles.fotoRow}>
                    {form.fotoUri || form.fotoUrlExistente ? (
                      <Image
                        source={{ uri: form.fotoUri || form.fotoUrlExistente || undefined }}
                        style={styles.fotoPreview}
                      />
                    ) : (
                      <View style={styles.fotoPreviewPlaceholder}>
                        <InstitutionalIcon name="person" size={28} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                      </View>
                    )}
                    <TouchableOpacity style={styles.fotoPickerBtn} onPress={seleccionarFotoMecanico}>
                      <InstitutionalIcon name="camera" size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                      <Text style={styles.fotoPickerText}>
                        {form.fotoUri || form.fotoUrlExistente ? 'Cambiar foto' : 'Agregar foto'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Modalidad de atención</Text>
                  <View style={styles.chipsRow}>
                    {MODALIDADES.map((mod) => {
                      const sel = form.modalidad_tecnico === mod.value;
                      return (
                        <TouchableOpacity
                          key={mod.value}
                          style={[styles.chip, sel && styles.chipSelected]}
                          onPress={() => setForm((p) => ({ ...p, modalidad_tecnico: mod.value }))}
                        >
                          <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{mod.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.label}>Especialidades</Text>
                  <View style={styles.chipsRow}>
                    {categorias.map((cat) => {
                      const sel = form.especialidades.includes(cat.id);
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.chip, sel && styles.chipSelected]}
                          onPress={() => toggleEspecialidad(cat.id)}
                        >
                          <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{cat.nombre}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.modalBtnGhostText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={guardar} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={I.white} />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: I.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: hx, paddingBottom: SPACING['2xl'] },
  tabsWrap: {
    paddingHorizontal: hx,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionTitle: { fontFamily: FF.semibold, fontSize: 16, color: I.text },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: I.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDERS.radius.md,
  },
  addBtnText: { color: I.white, fontFamily: FF.semibold, marginLeft: 4 },
  addInline: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDERS.radius.md,
    borderWidth: 1,
    borderColor: withOpacity(I.primary, 0.3),
    borderStyle: 'dashed',
  },
  addInlineText: { color: I.primary, fontFamily: FF.semibold, marginLeft: SPACING.sm },
  card: {
    backgroundColor: I.white,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  cardInactiva: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: withOpacity(I.primary, 0.08),
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: withOpacity(I.primary, 0.08),
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  fotoPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: withOpacity(I.text, 0.06),
  },
  fotoPreviewPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: withOpacity(I.text, 0.06),
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDERS.radius.md,
    borderWidth: 1,
    borderColor: withOpacity(I.primary, 0.35),
  },
  fotoPickerText: { color: I.primary, fontFamily: FF.semibold, marginLeft: 6, fontSize: 13 },
  cardTitle: { fontFamily: FF.semibold, fontSize: 15, color: I.text },
  cardSubtitle: { fontFamily: FF.regular, fontSize: 12, color: I.muted, marginTop: 2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.full,
    borderWidth: 1,
    borderColor: withOpacity(I.primary, 0.4),
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  chipSelected: { backgroundColor: I.primary, borderColor: I.primary },
  chipText: { color: I.primary, fontFamily: FF.regular, fontSize: 13 },
  chipTextSelected: { color: I.white, fontFamily: FF.semibold },
  chipReadonly: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.full,
    backgroundColor: withOpacity(I.primary, 0.1),
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  chipReadonlyText: { color: I.primary, fontFamily: FF.regular, fontSize: 12 },
  cardActions: { flexDirection: 'row', marginTop: SPACING.md },
  cardActionsInline: { flexDirection: 'row', alignItems: 'center' },
  sectionMini: { fontFamily: FF.bold, fontSize: 14, color: I.text, marginTop: SPACING.lg, marginBottom: SPACING.xs },
  helperText: { fontFamily: FF.regular, fontSize: 12, color: I.muted, marginBottom: SPACING.xs },
  inputDisabled: { backgroundColor: withOpacity(I.text, 0.05), color: I.muted },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: withOpacity(I.text, 0.1),
  },
  permLabel: { fontFamily: FF.semibold, fontSize: 14, color: I.text },
  permDesc: { fontFamily: FF.regular, fontSize: 12, color: I.muted, marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: SPACING.lg },
  actionBtnText: { color: I.primary, fontFamily: FF.semibold, marginLeft: 4, fontSize: 13 },
  emptyText: { color: I.muted, fontFamily: FF.regular, fontSize: 14, paddingVertical: SPACING.md },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: I.white,
    borderTopLeftRadius: BORDERS.radius.lg,
    borderTopRightRadius: BORDERS.radius.lg,
    padding: SPACING.lg,
  },
  modalTitle: { fontFamily: FF.bold, fontSize: 18, color: I.text, marginBottom: SPACING.md },
  label: { fontFamily: FF.semibold, fontSize: 13, color: I.text, marginTop: SPACING.md, marginBottom: SPACING.xs },
  input: {
    borderWidth: 1,
    borderColor: withOpacity(I.text, 0.15),
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontFamily: FF.regular,
    color: I.text,
  },
  modalActions: { flexDirection: 'row', marginTop: SPACING.lg },
  modalBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: BORDERS.radius.md, alignItems: 'center' },
  modalBtnGhost: { marginRight: SPACING.sm, backgroundColor: withOpacity(I.text, 0.06) },
  modalBtnGhostText: { color: I.text, fontFamily: FF.semibold },
  modalBtnPrimary: { backgroundColor: I.primary },
  modalBtnPrimaryText: { color: I.white, fontFamily: FF.semibold },
});
