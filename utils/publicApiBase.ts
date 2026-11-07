const PRODUCTION_API_FALLBACK = 'https://mecanimovil-api.onrender.com';

export type PublicApiStorage = {
  getItem(key: string): string | null;
};

function withApiSuffix(url: string): string {
  const trimmed = url.replace(/\/$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

/**
 * Bearer pages (public quote and informe) must call only the configured API
 * in a production bundle. A localStorage override is a dev-test hook: an
 * exported build ignores it so the token in the URL is not sent to an
 * origin chosen by the page.
 */
export function resolvePublicApiBase(input: {
  dev: boolean;
  storage?: PublicApiStorage | null;
  productionUrl?: string | null;
}): string {
  if (input.dev && input.storage) {
    const force = input.storage.getItem('FORCE_LOCAL_API');
    const local = input.storage.getItem('LOCAL_API_URL');
    if (force === 'true' && local && /^https?:\/\//i.test(local.trim())) {
      return withApiSuffix(local.trim());
    }
  }
  return withApiSuffix((input.productionUrl || PRODUCTION_API_FALLBACK).trim());
}

export function publicApiBase(): string {
  const dev = typeof __DEV__ !== 'undefined' && __DEV__ === true;
  const storage = dev && typeof localStorage !== 'undefined' ? localStorage : null;
  return resolvePublicApiBase({
    dev,
    storage,
    productionUrl: process.env.EXPO_PUBLIC_PRODUCTION_API_URL,
  });
}
