const BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

let getToken: () => Promise<string | null> = async () => null;
export const setTokenGetter = (fn: typeof getToken) => { getToken = fn; };

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

/** JSON survives a round trip; anything else (a proxy's HTML 502, say) does not. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// The line to put in front of a person.
function errorMessage(body: unknown, text: string, fallback: string): string {
  if (body !== null && typeof body === 'object') {
    const { error, errors } = body as { error?: unknown, errors?: unknown };

    if (typeof error === 'string' && error) return error;

    if (errors !== null && typeof errors === 'object') {
      const problems = Object.entries(errors as Record<string, unknown>)
        .filter(([, problem]) => typeof problem === 'string')
        .map(([field, problem]) => `${field} ${problem as string}`);

      if (problems.length > 0) return problems.join(', ');
    }
  }

  return text.trim() || fallback;
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

  // Read the body as text before deciding what it is.
  const text = res.status === 204 ? '' : await res.text();
  const body = text ? parseJson(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(body, text, res.statusText), body ?? text);
  }

  return body as T;
}

// The machine-readable tag on a refusal, when the API attached one.
export function apiErrorCode(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  if (error.body === null || typeof error.body !== 'object') return undefined;

  const { code } = error.body as { code?: unknown };
  return typeof code === 'string' ? code : undefined;
}
