import { resolvePublicApiBase } from '@/utils/publicApiBase';

const PRODUCTION = 'https://mecanimovil-api.onrender.com';

function storage(values: Record<string, string>) {
  return {
    getItem(key: string) {
      return values[key] ?? null;
    },
  };
}

describe('resolvePublicApiBase', () => {
  it('ignores a localStorage override when the bundle is not a dev build', () => {
    const base = resolvePublicApiBase({
      dev: false,
      storage: storage({
        FORCE_LOCAL_API: 'true',
        LOCAL_API_URL: 'http://evil.example/api',
      }),
      productionUrl: PRODUCTION,
    });
    expect(base).toBe(`${PRODUCTION}/api`);
    expect(base).not.toContain('evil.example');
  });

  it('ignores the override when the dev flag is missing even if storage asks for it', () => {
    const base = resolvePublicApiBase({
      dev: false,
      storage: storage({
        FORCE_LOCAL_API: 'true',
        LOCAL_API_URL: 'http://127.0.0.1:8010/api',
      }),
      productionUrl: 'https://api.example.com',
    });
    expect(base).toBe('https://api.example.com/api');
  });

  it('uses the local API only for a dev build with an http(s) override', () => {
    const base = resolvePublicApiBase({
      dev: true,
      storage: storage({
        FORCE_LOCAL_API: 'true',
        LOCAL_API_URL: 'http://127.0.0.1:8010/api/',
      }),
      productionUrl: PRODUCTION,
    });
    expect(base).toBe('http://127.0.0.1:8010/api');
  });

  it('rejects a non-http override and stays on the configured API', () => {
    const base = resolvePublicApiBase({
      dev: true,
      storage: storage({
        FORCE_LOCAL_API: 'true',
        LOCAL_API_URL: 'javascript:alert(1)',
      }),
      productionUrl: PRODUCTION,
    });
    expect(base).toBe(`${PRODUCTION}/api`);
  });
});
