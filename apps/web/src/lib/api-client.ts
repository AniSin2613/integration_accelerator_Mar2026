const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
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
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
