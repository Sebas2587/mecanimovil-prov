import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type ColorValue } from 'react-native';
import { Image } from 'expo-image';
import { router, usePathname, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  CalendarDays,
  ClipboardList,
  Menu,
  MessageCircle,
  Plus,
  Wrench,
} from 'lucide-react-native';
import { InstitutionalText } from '@/design-system/components/InstitutionalText';
import { BORDERS, COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/design-system/iconography';
import { useAlerts } from '@/context/AlertsContext';
import { useAuth } from '@/context/AuthContext';
import { useChats } from '@/context/ChatsContext';
import websocketService, { type NuevaSolicitudEvent } from '@/app/services/websocketService';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

const SECCIONES = [
  { href: '/', etiqueta: 'Hoy', coincide: (ruta: string) => ruta === '/' || ruta === '/index' },
  { href: '/cotizaciones', etiqueta: 'Cotizaciones', coincide: (ruta: string) => ruta === '/cotizaciones' || ruta.startsWith('/cotizaciones?') },
  { href: '/bandeja', etiqueta: 'Clientes', coincide: (ruta: string) => ruta === '/bandeja' || ruta.startsWith('/bandeja?') },
  { href: '/calendario', etiqueta: 'Agenda', coincide: (ruta: string) => ruta === '/calendario' || ruta.startsWith('/calendario?') },
] as const;

type Props = {
  nombre: string;
  porAgendar: number;
  variante: 'superior' | 'marca';
  compacto?: boolean;
};

export function TallerChrome({ nombre, porAgendar, variante }: Props) {
  const insets = useSafeAreaInsets();
  const ruta = usePathname();
  const { estadoProveedor, usuario } = useAuth();
  const [fotoFallida, setFotoFallida] = useState(false);
  const fotoTaller = estadoProveedor?.datos_proveedor?.foto_perfil || usuario?.foto_perfil || '';
  const { alertasNoLeidas } = useAlerts();
  const { totalMensajesNoLeidos } = useChats();
  const [solicitudesNuevas, setSolicitudesNuevas] = useState(0);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    setFotoFallida(false);
  }, [fotoTaller]);

  useEffect(() => {
    setMenuAbierto(false);
  }, [ruta]);

  useEffect(() => {
    const unsubscribe = websocketService.onNuevaSolicitud((_event: NuevaSolicitudEvent) => {
      setSolicitudesNuevas((prev) => prev + 1);
    });
    return unsubscribe;
  }, []);

  const avisos = alertasNoLeidas + solicitudesNuevas;
  const marca = (
    <Pressable
      onPress={() => router.push('/(tabs)')}
      style={styles.marca}
      accessibilityRole="button"
      accessibilityLabel={nombre || 'Inicio'}
    >
      <View style={styles.marcaIcono}>
        {fotoTaller && !fotoFallida ? (
          <Image
            source={{ uri: fotoTaller }}
            style={styles.marcaFoto}
            contentFit="cover"
            onError={() => setFotoFallida(true)}
            accessibilityLabel={`Foto de ${nombre || 'taller'}`}
          />
        ) : (
          <Wrench size={16} color={I.onPrimary} strokeWidth={2.25} />
        )}
      </View>
      {variante === 'superior' || variante === 'marca' ? (
        <InstitutionalText role="h5" numberOfLines={1} style={styles.marcaNombre}>
          {nombre || 'Taller'}
        </InstitutionalText>
      ) : null}
    </Pressable>
  );

  const utilidades = (
    <View style={styles.utilidades}>
      <IconoNav
        label="Notificaciones"
        onPress={() => {
          setSolicitudesNuevas(0);
          router.push('/notificaciones');
        }}
        conteo={avisos}
      >
        <Bell size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
      </IconoNav>
      <IconoNav
        label="Mensajes"
        onPress={() => router.push('/(tabs)/chats')}
        conteo={totalMensajesNoLeidos}
      >
        <MessageCircle size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
      </IconoNav>
      <IconoNav label="Servicios" onPress={() => router.push('/(tabs)/ordenes')}>
        <ClipboardList size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
      </IconoNav>
      <IconoNav label="Menú" onPress={() => router.push('/(tabs)/perfil')}>
        <Menu size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
      </IconoNav>
    </View>
  );

  if (variante === 'marca') {
    return (
      <View style={[styles.marcaBar, { paddingTop: Math.max(insets.top, SPACING.fixed.xs) }]}>
        {marca}
        {utilidades}
      </View>
    );
  }

  return (
    <View style={styles.superior}>
      <View style={styles.zona}>{marca}</View>
      <View style={styles.nav} accessibilityRole="tablist">
          {SECCIONES.map((seccion) => {
            const activa = seccion.coincide(ruta);
            return (
              <Pressable
                key={seccion.etiqueta}
                onPress={() => router.navigate(seccion.href as Href)}
                style={[styles.navItem, activa && styles.navItemOn]}
                accessibilityRole="tab"
                accessibilityState={{ selected: activa }}
              >
                <InstitutionalText role={activa ? 'bodyBold' : 'body'} color={activa ? 'ink' : 'body'}>
                  {seccion.etiqueta}
                </InstitutionalText>
                {seccion.etiqueta === 'Agenda' && porAgendar > 0 ? (
                  <View style={styles.navBadge}>
                    <InstitutionalText role="captionBold" color="onPrimary">
                      {porAgendar > 9 ? '9+' : String(porAgendar)}
                    </InstitutionalText>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
      </View>
      <View style={styles.zonaDerecha}>
        <Pressable
          onPress={() => router.push('/cotizar-ia')}
          style={styles.cta}
          accessibilityRole="button"
          accessibilityLabel="Nueva cotización"
        >
          <Plus size={16} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
          <InstitutionalText role="bodyBold" color="onPrimary">Nueva cotización</InstitutionalText>
        </Pressable>
        <View>
          <IconoNav
            label="Más del taller"
            onPress={() => setMenuAbierto((abierto) => !abierto)}
            conteo={avisos + totalMensajesNoLeidos}
          >
            <Menu size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
          </IconoNav>
          {menuAbierto ? (
            <View style={styles.menu}>
              <OpcionMenu
                label="Notificaciones"
                detalle={avisos > 0 ? String(avisos) : undefined}
                onPress={() => {
                  setMenuAbierto(false);
                  setSolicitudesNuevas(0);
                  router.push('/notificaciones');
                }}
              />
              <OpcionMenu
                label="Mensajes"
                detalle={totalMensajesNoLeidos > 0 ? String(totalMensajesNoLeidos) : undefined}
                onPress={() => {
                  setMenuAbierto(false);
                  router.push('/(tabs)/chats');
                }}
              />
              <OpcionMenu
                label="Servicios"
                onPress={() => {
                  setMenuAbierto(false);
                  router.push('/(tabs)/ordenes');
                }}
              />
              <OpcionMenu
                label="Menú"
                onPress={() => {
                  setMenuAbierto(false);
                  router.push('/(tabs)/perfil');
                }}
              />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function NuevaCotizacionFlotante({ bottom }: { bottom: number }) {
  return (
    <View pointerEvents="box-none" style={[styles.flotanteWrap, { bottom }]}>
      <Pressable
        onPress={() => router.push('/cotizar-ia')}
        style={styles.flotante}
        accessibilityRole="button"
        accessibilityLabel="Nueva cotización"
      >
        <Plus size={16} color={I.onDark} strokeWidth={2.25} />
        <InstitutionalText role="bodyBold" color={I.onDark}>Nueva cotización</InstitutionalText>
      </Pressable>
    </View>
  );
}

export function AgendaTabIcon({
  color,
  focused,
  conteo,
}: {
  color: ColorValue;
  focused: boolean;
  conteo: number;
}) {
  return (
    <View>
      <CalendarDays size={22} color={color} strokeWidth={focused ? 2 : 1.75} />
      {conteo > 0 ? (
        <View style={styles.tabBadge}>
          <InstitutionalText role="captionBold" color="onPrimary" style={styles.tabBadgeText}>
            {conteo > 9 ? '9+' : String(conteo)}
          </InstitutionalText>
        </View>
      ) : null}
    </View>
  );
}

function OpcionMenu({
  label,
  detalle,
  onPress,
}: {
  label: string;
  detalle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.opcion} accessibilityRole="button">
      <InstitutionalText role="body">{label}</InstitutionalText>
      {detalle ? (
        <InstitutionalText role="captionBold" color="primary">{detalle}</InstitutionalText>
      ) : null}
    </Pressable>
  );
}

function IconoNav({
  children,
  label,
  onPress,
  conteo = 0,
}: {
  children: React.ReactNode;
  label: string;
  onPress: () => void;
  conteo?: number;
}) {
  return (
    <Pressable onPress={onPress} style={styles.icono} accessibilityRole="button" accessibilityLabel={label}>
      {children}
      {conteo > 0 ? <View style={styles.punto} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  superior: {
    height: 72,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    backgroundColor: I.canvas,
  },
  marcaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    paddingBottom: SPACING.fixed.xs,
    backgroundColor: I.canvas,
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    flexShrink: 1,
    minWidth: 0,
  },
  marcaIcono: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  marcaFoto: {
    width: 36,
    height: 36,
  },
  marcaNombre: {
    flexShrink: 1,
  },
  zona: {
    flex: 1,
    minWidth: 0,
    zIndex: 1,
  },
  zonaDerecha: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    zIndex: 2,
  },
  menu: {
    position: 'absolute',
    top: 48,
    right: 0,
    width: 220,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.paper,
    paddingVertical: SPACING.fixed.xs,
    zIndex: 5,
  },
  opcion: {
    minHeight: 44,
    paddingHorizontal: SPACING.fixed.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    gap: 4,
    zIndex: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BORDERS.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navItemOn: {
    backgroundColor: I.surfaceSoft,
  },
  navBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  superiorAcciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: SPACING.fixed.md,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.primary,
  },
  utilidades: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  punto: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: I.primary,
  },
  flotanteWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 30,
    alignItems: 'center',
  },
  flotante: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  tabBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    fontSize: 10,
    fontFamily: FF.sansSemiBold,
  },
});
