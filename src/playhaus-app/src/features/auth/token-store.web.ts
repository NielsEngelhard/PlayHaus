import type { User } from '@/api/calls/auth';

// Web half of the token store — see `token-store.ts` for the contract.
const TOKEN_KEY = 'playhaus_session_token';
const USER_KEY = 'playhaus_session_user';

// `output: "static"` prerenders every route in Node, where there is no `window`.
function storage(): Storage | null {
    return typeof window === 'undefined' ? null : window.localStorage;
}

export async function readToken(): Promise<string | null> {
    return storage()?.getItem(TOKEN_KEY) ?? null;
}

export async function writeToken(token: string): Promise<void> {
    storage()?.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
    storage()?.removeItem(TOKEN_KEY);
}

export async function readCachedUser(): Promise<User | null> {
    const stored = storage()?.getItem(USER_KEY) ?? null;
    if (stored === null) return null;

    try {
        return JSON.parse(stored) as User;
    } catch {
        return null;
    }
}

export async function writeCachedUser(user: User): Promise<void> {
    storage()?.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearCachedUser(): Promise<void> {
    storage()?.removeItem(USER_KEY);
}
