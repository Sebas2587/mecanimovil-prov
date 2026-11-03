/**
 * Tests para lógica de navegación del proveedor
 * Verifica que la app navegue correctamente según estado de onboarding/verificación
 */
import { resolveProveedorRoute, shouldSkipTipoCuenta } from '../resolveProveedorRoute';
import type { EstadoProveedor } from '@/services/api';

describe('resolveProveedorRoute', () => {
  it('debe redirigir a login si no está autenticado', () => {
    const route = resolveProveedorRoute(null, { authenticated: false });
    expect(route).toEqual({ kind: 'href', href: '/(auth)/login' });
  });

  it('debe reintentar si estado es null pero está autenticado', () => {
    const route = resolveProveedorRoute(null);
    expect(route).toEqual({ kind: 'retry' });
  });

  it('debe ir a tabs si proveedor está aprobado', () => {
    const estado: EstadoProveedor = {
      tiene_perfil: true,
      estado_verificacion: 'aprobado',
      verificado: true,
      onboarding_completado: true,
      activo: true,
      datos_proveedor: {
        calificacion_promedio: 0,
        numero_de_calificaciones: 0,
      },
    };

    const route = resolveProveedorRoute(estado);
    expect(route).toEqual({ kind: 'href', href: '/(tabs)' });
  });

  it('debe ir a tipo-cuenta si no tiene perfil', () => {
    const estado: EstadoProveedor = {
      tiene_perfil: false,
      estado_verificacion: 'pendiente',
      verificado: false,
      onboarding_completado: false,
      activo: true,
      datos_proveedor: {
        calificacion_promedio: 0,
        numero_de_calificaciones: 0,
      },
    };

    const route = resolveProveedorRoute(estado);
    expect(route).toEqual({ kind: 'href', href: '/(onboarding)/tipo-cuenta' });
  });

  it('debe ir a informacion-basica si onboarding está iniciado', () => {
    const estado: EstadoProveedor = {
      tiene_perfil: true,
      onboarding_iniciado: true,
      estado_verificacion: 'pendiente',
      verificado: false,
      onboarding_completado: false,
      activo: true,
      datos_proveedor: {
        calificacion_promedio: 0,
        numero_de_calificaciones: 0,
      },
    };

    const route = resolveProveedorRoute(estado);
    expect(route).toEqual({ kind: 'href', href: '/(onboarding)/informacion-basica' });
  });

  it('debe ir a tabs si onboarding está completado', () => {
    const estado: EstadoProveedor = {
      tiene_perfil: true,
      onboarding_completado: true,
      estado_verificacion: 'en_revision',
      verificado: false,
      activo: true,
      datos_proveedor: {
        calificacion_promedio: 0,
        numero_de_calificaciones: 0,
      },
    };

    const route = resolveProveedorRoute(estado);
    expect(route).toEqual({ kind: 'href', href: '/(tabs)' });
  });

  it('debe ir a tabs si necesita_onboarding es false', () => {
    const estado: EstadoProveedor = {
      tiene_perfil: true,
      necesita_onboarding: false,
      estado_verificacion: 'pendiente',
      verificado: false,
      onboarding_completado: false,
      activo: true,
      datos_proveedor: {
        calificacion_promedio: 0,
        numero_de_calificaciones: 0,
      },
    };

    const route = resolveProveedorRoute(estado);
    expect(route).toEqual({ kind: 'href', href: '/(tabs)' });
  });
});

describe('shouldSkipTipoCuenta', () => {
  it('debe retornar false si estado es null', () => {
    expect(shouldSkipTipoCuenta(null)).toBe(false);
  });

  it('debe retornar true si proveedor está aprobado', () => {
    const estado: EstadoProveedor = {
      tiene_perfil: true,
      estado_verificacion: 'aprobado',
      verificado: true,
      onboarding_completado: true,
      activo: true,
      datos_proveedor: {
        calificacion_promedio: 0,
        numero_de_calificaciones: 0,
      },
    };

    expect(shouldSkipTipoCuenta(estado)).toBe(true);
  });

  it('debe retornar true si onboarding está completado', () => {
    const estado: EstadoProveedor = {
      tiene_perfil: true,
      onboarding_completado: true,
      estado_verificacion: 'en_revision',
      verificado: false,
      activo: true,
      datos_proveedor: {
        calificacion_promedio: 0,
        numero_de_calificaciones: 0,
      },
    };

    expect(shouldSkipTipoCuenta(estado)).toBe(true);
  });

  it('debe retornar true si tiene perfil y onboarding iniciado', () => {
    const estado: EstadoProveedor = {
      tiene_perfil: true,
      onboarding_iniciado: true,
      estado_verificacion: 'pendiente',
      verificado: false,
      onboarding_completado: false,
      activo: true,
      datos_proveedor: {
        calificacion_promedio: 0,
        numero_de_calificaciones: 0,
      },
    };

    expect(shouldSkipTipoCuenta(estado)).toBe(true);
  });

  it('debe retornar false si necesita completar onboarding', () => {
    const estado: EstadoProveedor = {
      tiene_perfil: false,
      estado_verificacion: 'pendiente',
      verificado: false,
      onboarding_completado: false,
      activo: true,
      datos_proveedor: {
        calificacion_promedio: 0,
        numero_de_calificaciones: 0,
      },
    };

    expect(shouldSkipTipoCuenta(estado)).toBe(false);
  });
});
