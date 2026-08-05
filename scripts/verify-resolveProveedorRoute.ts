/**
 * Verificación de matriz de rutas post-login / cold start.
 * Ejecutar: npx tsx scripts/verify-resolveProveedorRoute.ts
 */
import {
  resolveProveedorRoute,
  shouldSkipTipoCuenta,
} from '../utils/auth/resolveProveedorRoute';
import type { EstadoProveedor } from '../services/api';

type Case = {
  name: string;
  estado: EstadoProveedor | null;
  expectHref?: string;
  expectKind?: 'retry' | 'stay' | 'href';
  skipTipoCuenta?: boolean;
};

const base: EstadoProveedor = {
  tiene_perfil: true,
  estado_verificacion: 'pendiente',
  verificado: false,
  onboarding_iniciado: true,
  onboarding_completado: false,
  activo: true,
};

const cases: Case[] = [
  {
    name: 'estado null → retry (index, nunca tipo-cuenta)',
    estado: null,
    expectKind: 'retry',
  },
  {
    name: 'aprobado → tabs',
    estado: { ...base, estado_verificacion: 'aprobado', onboarding_completado: true },
    expectHref: '/(tabs)',
    skipTipoCuenta: true,
  },
  {
    name: 'onboarding completado en revisión → tabs',
    estado: { ...base, onboarding_completado: true },
    expectHref: '/(tabs)',
    skipTipoCuenta: true,
  },
  {
    name: 'necesita_onboarding false → tabs',
    estado: { ...base, necesita_onboarding: false },
    expectHref: '/(tabs)',
    skipTipoCuenta: true,
  },
  {
    name: 'sin perfil → tipo-cuenta',
    estado: {
      tiene_perfil: false,
      estado_verificacion: 'pendiente',
      verificado: false,
      onboarding_iniciado: false,
      onboarding_completado: false,
      activo: false,
    },
    expectHref: '/(onboarding)/tipo-cuenta',
    skipTipoCuenta: false,
  },
  {
    name: 'perfil iniciado incompleto → informacion-basica',
    estado: { ...base, onboarding_iniciado: true, onboarding_completado: false },
    expectHref: '/(onboarding)/informacion-basica',
    skipTipoCuenta: true,
  },
];

let failed = 0;

for (const c of cases) {
  const route = resolveProveedorRoute(c.estado, { authenticated: true });
  const kindOk = c.expectKind ? route.kind === c.expectKind : true;
  const hrefOk = c.expectHref
    ? route.kind === 'href' && route.href === c.expectHref
    : true;
  const skipOk =
    c.skipTipoCuenta === undefined
      ? true
      : shouldSkipTipoCuenta(c.estado) === c.skipTipoCuenta;

  if (!kindOk || !hrefOk || !skipOk) {
    failed += 1;
    console.error(`FAIL: ${c.name}`, { route, kindOk, hrefOk, skipOk });
  } else {
    console.log(`OK: ${c.name}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} caso(s) fallaron`);
  process.exit(1);
}

console.log(`\n${cases.length} casos OK — matriz resolveProveedorRoute verificada`);
