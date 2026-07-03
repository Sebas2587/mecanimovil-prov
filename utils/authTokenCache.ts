import { deleteItem, getItem, setItem } from '@/utils/authStorage';

/** undefined = aún no hidratado desde storage */
let memoryToken: string | null | undefined;
let loadPromise: Promise<string | null> | null = null;
let authHydrated = false;
const hydrateWaiters: Array<() => void> = [];

export function beginAuthHydration(): void {
  authHydrated = false;
}

export function completeAuthHydration(token: string | null): void {
  memoryToken = token;
  loadPromise = null;
  authHydrated = true;
  while (hydrateWaiters.length) {
    hydrateWaiters.shift()?.();
  }
}

export async function waitForAuthHydration(): Promise<void> {
  if (authHydrated) return;
  await new Promise<void>((resolve) => {
    hydrateWaiters.push(resolve);
  });
}

export function isAuthHydrated(): boolean {
  return authHydrated;
}

export async function resolveAuthToken(): Promise<string | null> {
  if (memoryToken !== undefined) return memoryToken;
  if (!loadPromise) {
    loadPromise = getItem('authToken').then((token) => {
      memoryToken = token;
      loadPromise = null;
      return token;
    });
  }
  return loadPromise;
}

export async function persistAuthToken(token: string): Promise<void> {
  memoryToken = token;
  loadPromise = null;
  await setItem('authToken', token);
}

export async function clearAuthTokenCache(): Promise<void> {
  memoryToken = null;
  loadPromise = null;
  await deleteItem('authToken');
}
