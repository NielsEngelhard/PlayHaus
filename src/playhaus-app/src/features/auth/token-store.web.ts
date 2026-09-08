// Web half of the token store — see `token-store.ts` for the contract.
const TOKEN_KEY = 'playhaus_session_token';

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
