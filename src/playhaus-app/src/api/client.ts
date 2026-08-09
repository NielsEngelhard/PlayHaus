const BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

let getToken: () => Promise<string | null> = async () => null;
export const setTokenGetter = (fn: typeof getToken) => { getToken = fn; };

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

/** JSON survives a round trip; anything else (Go's plain-text errors) does not. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
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

  // Read the body as text before deciding what it is. The API answers successes
  // with JSON but failures with `http.Error`, which is text/plain — so calling
  // res.json() first would throw on exactly the responses whose message we most
  // want to put in front of the user.
  const text = res.status === 204 ? '' : await res.text();
  const body = text ? parseJson(text) : null;

  if (!res.ok) {
    const message = (body as { title?: string } | null)?.title || text.trim() || res.statusText;
    throw new ApiError(res.status, message, body ?? text);
  }

  return body as T;
}
