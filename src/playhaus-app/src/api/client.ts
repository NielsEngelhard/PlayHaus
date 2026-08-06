const BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

let getToken: () => Promise<string | null> = async () => null;
export const setTokenGetter = (fn: typeof getToken) => { getToken = fn; };

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.title ?? res.statusText, body);
  return body as T;
}