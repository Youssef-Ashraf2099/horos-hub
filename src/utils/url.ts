const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/**
 * Prefix an internal path with Astro's configured BASE_URL (/horos-hub).
 */
export function withBase(path: string): string {
  if (!path) return `${BASE}/`;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('mailto:') || path.startsWith('#')) {
    return path;
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${normalized}`;
}

export function absoluteUrl(path: string): string {
  const rel = withBase(path);
  return `https://Youssef-Ashraf2099.github.io${rel}`;
}
