/**
 * Web half of the token store — see `token-store.ts` for the contract.
 *
 * `localStorage` is readable by any script on the page, so unlike the native
 * keychain this offers no protection against XSS. It is the standard trade for a
 * browser app: the alternative is keeping the token in memory only, which logs
 * you out on every refresh.
 */
const TOKEN_KEY = 'playhaus_session_token';

/**
 * `output: "static"` prerenders every route in Node, where there is no `window`.
 * Returning null there keeps the build from crashing; the real value is read
 * again once the page hydrates in a browser.
 */
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
