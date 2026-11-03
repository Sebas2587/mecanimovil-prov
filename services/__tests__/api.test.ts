/**
 * Tests para servicios de autenticación (authAPI)
 * Verifica login, logout, y obtención de estado del proveedor
 */
import { authAPI, EstadoProveedor } from '../api';
import * as authStorage from '@/utils/authStorage';
import * as authTokenCache from '@/utils/authTokenCache';

// Mock axios
jest.mock('axios');
const axios = require('axios');

// Mock de storage y cache
jest.mock('@/utils/authStorage');
jest.mock('@/utils/authTokenCache');

// Mock de ServerConfig
jest.mock('../serverConfig', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      initialize: jest.fn().mockResolvedValue(true),
      getBaseURL: jest.fn().mockResolvedValue('https://test-api.example.com/api'),
      getMediaBaseURL: jest.fn().mockResolvedValue('https://test-api.example.com'),
    })),
  },
}));

describe('authAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('debe autenticar correctamente con credenciales válidas', async () => {
      const mockResponse = {
        token: 'test-token-123',
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      (authTokenCache.persistAuthToken as jest.Mock).mockResolvedValue(undefined);
      (authStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await authAPI.login({
        username: 'testuser',
        password: 'testpass123',
      });

      expect(result.token).toBe('test-token-123');
      expect(authTokenCache.persistAuthToken).toHaveBeenCalledWith('test-token-123');
      expect(authStorage.setItem).toHaveBeenCalledWith(
        'userData',
        JSON.stringify(mockResponse.user)
      );
    });

    it('debe rechazar con credenciales inválidas', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({
          detail: 'Credenciales inválidas',
        }),
      });

      await expect(
        authAPI.login({
          username: 'wronguser',
          password: 'wrongpass',
        })
      ).rejects.toThrow('Credenciales inválidas');
    });

    it('debe reintentar hasta 3 veces en errores de red', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network Error'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            token: 'retry-token',
            user: { id: 1, username: 'test' },
          }),
        });
      });

      (authTokenCache.persistAuthToken as jest.Mock).mockResolvedValue(undefined);
      (authStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await authAPI.login({
        username: 'test',
        password: 'test',
      });

      expect(result.token).toBe('retry-token');
      expect(callCount).toBe(3);
    });
  });

  describe('logout', () => {
    it('debe limpiar tokens y datos de usuario', async () => {
      (authTokenCache.clearAuthTokenCache as jest.Mock).mockResolvedValue(undefined);
      (authStorage.deleteItem as jest.Mock).mockResolvedValue(undefined);

      await authAPI.logout();

      expect(authTokenCache.clearAuthTokenCache).toHaveBeenCalled();
      expect(authStorage.deleteItem).toHaveBeenCalledWith('userData');
    });
  });

  describe('isAuthenticated', () => {
    it('debe retornar true si hay token', async () => {
      (authStorage.getItem as jest.Mock).mockResolvedValue('test-token');

      const result = await authAPI.isAuthenticated();

      expect(result).toBe(true);
    });

    it('debe retornar false si no hay token', async () => {
      (authStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await authAPI.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('obtenerEstadoProveedor', () => {
    it('debe retornar el estado del proveedor autenticado', async () => {
      const mockEstado: EstadoProveedor = {
        tiene_perfil: true,
        tipo_proveedor: 'taller',
        rol_taller: 'mandante',
        estado_verificacion: 'aprobado',
        verificado: true,
        onboarding_completado: true,
        activo: true,
        datos_proveedor: {
          descripcion: 'Test Taller',
          calificacion_promedio: 4.5,
          numero_de_calificaciones: 10,
        },
      };

      // Mock de axios instance
      const mockGet = jest.fn().mockResolvedValue({ data: mockEstado });
      axios.create.mockReturnValue({
        get: mockGet,
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      });

      (authStorage.getItem as jest.Mock).mockResolvedValue('valid-token');

      const result = await authAPI.obtenerEstadoProveedor();

      expect(result.tiene_perfil).toBe(true);
      expect(result.tipo_proveedor).toBe('taller');
      expect(result.estado_verificacion).toBe('aprobado');
    });

    it('debe lanzar error si no hay token', async () => {
      (authStorage.getItem as jest.Mock).mockResolvedValue(null);

      await expect(authAPI.obtenerEstadoProveedor()).rejects.toThrow(
        'No autenticado'
      );
    });
  });
});
