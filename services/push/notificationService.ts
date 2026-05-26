import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { post } from '@/services/api';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

type NotificationsModule = typeof import('expo-notifications');
type DeviceModule = typeof import('expo-device');

const ANDROID_CHANNEL_DEFS = [
  {
    id: 'default',
    name: 'General',
    importanceKey: 'DEFAULT' as const,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0052FF',
    sound: 'default' as const,
  },
  {
    id: 'servicios',
    name: 'Solicitudes y servicios',
    description: 'Nuevas solicitudes, ofertas y cambios de estado',
    importanceKey: 'HIGH' as const,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0052FF',
    sound: 'default' as const,
  },
  {
    id: 'chat',
    name: 'Chat',
    description: 'Mensajes con clientes',
    importanceKey: 'HIGH' as const,
    vibrationPattern: [0, 200, 200, 200],
    lightColor: '#6366F1',
    sound: 'default' as const,
  },
  {
    id: 'suscripciones',
    name: 'Suscripción y créditos',
    importanceKey: 'DEFAULT' as const,
    vibrationPattern: [0, 200],
    lightColor: '#F59E0B',
    sound: 'default' as const,
  },
] as const;

let notificationHandlerConfigured = false;

function loadNotifications(): NotificationsModule | null {
  if (IS_EXPO_GO || Platform.OS === 'web') return null;
  return require('expo-notifications') as NotificationsModule;
}

function loadDevice(): DeviceModule | null {
  if (IS_EXPO_GO || Platform.OS === 'web') return null;
  return require('expo-device') as DeviceModule;
}

function configureNotificationHandler(Notifications: NotificationsModule): void {
  if (notificationHandlerConfigured) return;
  notificationHandlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

class NotificationService {
  private initPromise: Promise<void> | null = null;

  async ensureInitialized(): Promise<void> {
    const Notifications = loadNotifications();
    if (!Notifications) return;
    configureNotificationHandler(Notifications);
    if (!this.initPromise) {
      this.initPromise = this.initializeChannels(Notifications);
    }
    await this.initPromise;
  }

  private async initializeChannels(Notifications: NotificationsModule): Promise<void> {
    if (Platform.OS !== 'android') return;
    try {
      const importanceMap = Notifications.AndroidImportance;
      await Promise.all(
        ANDROID_CHANNEL_DEFS.map((ch) =>
          Notifications.setNotificationChannelAsync(ch.id, {
            name: ch.name,
            description: 'description' in ch ? ch.description : undefined,
            importance: importanceMap[ch.importanceKey],
            vibrationPattern: [...ch.vibrationPattern],
            lightColor: ch.lightColor,
            sound: ch.sound,
          }),
        ),
      );
    } catch (e) {
      if (__DEV__) console.warn('[NotificationService] canales Android:', e);
    }
  }

  isAvailable(): boolean {
    return Platform.OS !== 'web' && !IS_EXPO_GO;
  }

  async requestPermissions(): Promise<boolean> {
    const Notifications = loadNotifications();
    const Device = loadDevice();
    if (!Notifications || !Device) return false;

    if (!Device.isDevice && __DEV__) {
      console.log('[NotificationService] Simulador: push limitado');
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  }

  async obtenerPushToken(): Promise<string | null> {
    if (!this.isAvailable()) return null;

    await this.ensureInitialized();
    const Notifications = loadNotifications();
    if (!Notifications) return null;

    const granted = await this.requestPermissions();
    if (!granted) return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      if (__DEV__) console.warn('[NotificationService] Falta eas.projectId en app config');
      return null;
    }

    try {
      const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
      return data;
    } catch (e) {
      if (__DEV__) console.error('[NotificationService] getExpoPushTokenAsync:', e);
      return null;
    }
  }

  async registrarTokenEnBackend(token: string, userId: number): Promise<unknown> {
    try {
      const authToken = await SecureStore.getItemAsync('authToken');
      if (!authToken) return null;

      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      return await post('/usuarios/registrar-push-token/', {
        push_token: token,
        user_id: userId,
        dispositivo: `${Platform.OS} Device`,
        plataforma: platform,
      });
    } catch (e) {
      if (__DEV__) console.error('[NotificationService] registrar token:', e);
      return null;
    }
  }

  async desactivarTokenEnBackend(token: string): Promise<void> {
    try {
      await post('/usuarios/desactivar-push-token/', { push_token: token });
    } catch (e) {
      if (__DEV__) console.error('[NotificationService] desactivar token:', e);
    }
  }

  /** Registra permisos + token en backend tras login o restauración de sesión. */
  async syncPushTokenForUser(userId: number): Promise<void> {
    if (!userId || !this.isAvailable()) return;
    const token = await this.obtenerPushToken();
    if (token) {
      await this.registrarTokenEnBackend(token, userId);
    }
  }

  async deactivateOnLogout(): Promise<void> {
    if (!this.isAvailable()) return;
    const token = await this.obtenerPushToken();
    if (token) {
      await this.desactivarTokenEnBackend(token);
    }
  }
}

export default new NotificationService();
