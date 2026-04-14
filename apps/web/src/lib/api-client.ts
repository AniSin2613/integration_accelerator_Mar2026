const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';
const DEFAULT_TIMEOUT_MS = 15_000;

/** Singleton refresh promise — prevents concurrent refresh attempts */
let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(path: string, init: RequestInit = {}, _isRetry = false): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

    // On 401, try a silent token refresh and retry the original request once
    if (res.status === 401 && !_isRetry) {
      clearTimeout(timeout);
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        return request<T>(path, init, true);
      }
      // Refresh failed — redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
      throw new Error('Session expired. Redirecting to login.');
    }

    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      let message = body;
      try {
        const parsed = JSON.parse(body) as { message?: string | string[]; error?: string };
        if (Array.isArray(parsed.message)) {
          message = parsed.message.join('; ');
        } else if (typeof parsed.message === 'string' && parsed.message.trim().length > 0) {
          message = parsed.message;
        } else if (typeof parsed.error === 'string' && parsed.error.trim().length > 0) {
          message = parsed.error;
        }
      } catch {
        // Response body is not JSON; keep raw text.
      }
      throw new Error(`API ${res.status}: ${message}`);
    }

    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('API request timed out. The server may be unreachable.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
