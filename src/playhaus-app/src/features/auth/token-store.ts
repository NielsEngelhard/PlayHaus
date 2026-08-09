import * as SecureStore from 'expo-secure-store';

/**
 * Where the session token lives between app launches.
 *
 * The token is the whole session — anyone holding it is logged in — so on device
 * it goes in the OS keychain (iOS) / EncryptedSharedPreferences (Android) rather
 * than in plain app storage. `expo-secure-store` has no web implementation at
 * all, which is why `token-store.web.ts` sits beside this file; Metro picks the
 * right one per platform and callers import `@/features/auth/token-store`
 * without caring which they got.
 */
const TOKEN_KEY = 'playhaus_session_token';

export async function readToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function writeToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
}
