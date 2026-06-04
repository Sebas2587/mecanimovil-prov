type PaginatedPayload<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
};

type PageFetcher = (url: string) => Promise<{ data: PaginatedPayload<unknown> | unknown[] }>;

type FetchAllPaginatedOptions = {
  maxPages?: number;
  baseURL?: string;
};

/**
 * Recorre todas las páginas de un listado DRF (PAGE_SIZE global suele ser 10).
 * Si la respuesta ya es un array, lo devuelve tal cual.
 */
export async function fetchAllPaginated<T>(
  fetchPage: PageFetcher,
  initialPath: string,
  options: FetchAllPaginatedOptions = {},
): Promise<T[]> {
  const { maxPages = 100, baseURL } = options;
  const collected: T[] = [];
  let path: string | null = initialPath;
  let page = 0;

  while (path && page < maxPages) {
    page += 1;
    const response = await fetchPage(path);
    const data = response.data;

    if (Array.isArray(data)) {
      return data as T[];
    }

    const payload = data as PaginatedPayload<T>;
    const batch = Array.isArray(payload?.results) ? payload.results : [];
    collected.push(...batch);

    const next = payload?.next;
    if (!next) {
      path = null;
      continue;
    }

    const nextPath = resolvePaginatedNextUrl(next, baseURL);
    if (nextPath === path) {
      break;
    }
    path = nextPath;
  }

  return collected;
}

/** Normaliza URL `next` de DRF para axios (absoluta o relativa). */
export function resolvePaginatedNextUrl(next: string, baseURL?: string): string {
  if (next.startsWith('http://') || next.startsWith('https://')) {
    if (baseURL && next.startsWith(baseURL)) {
      return next.slice(baseURL.length) || '/';
    }
    try {
      const parsed = new URL(next);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return next;
    }
  }
  return next.startsWith('/') ? next : `/${next}`;
}
