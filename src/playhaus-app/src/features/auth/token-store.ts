import type { User } from '@/api/calls/auth';
import * as SecureStore from 'expo-secure-store';

// Where the session token lives between app launches.
const TOKEN_KEY = 'playhaus_session_token';

// The last user the token resolved to, kept so a launch with no network still knows who you are.
const USER_KEY = 'playhaus_session_user';

export async function readToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function writeToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function readCachedUser(): Promise<User | null> {
    const stored = await SecureStore.getItemAsync(USER_KEY);
    if (stored === null) return null;

    try {
        return JSON.parse(stored) as User;
    } catch {
        // A half-written or outdated cache is worth no more than an empty one.
        return null;
    }
}

export async function writeCachedUser(user: User): Promise<void> {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearCachedUser(): Promise<void> {
    await SecureStore.deleteItemAsync(USER_KEY);
}
