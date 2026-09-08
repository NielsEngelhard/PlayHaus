import * as SecureStore from 'expo-secure-store';

// Where the session token lives between app launches.
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
