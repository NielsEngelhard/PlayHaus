import { request } from '@/api/client';
import type { LanguageCode } from '@/constants/languages';

// A user as the API describes it.
export interface User {
    id: string
    // Always present.
    email: string
    name: string
    isGuest: boolean
    // The language the account plays in.
    locale: LanguageCode
    // Which swatch in `AVATAR_COLORS`, not a hex — what `lemon` looks like is the app's business.
    color: string
    enableSounds: boolean
    enableMusic: boolean
    enableVibration: boolean
    createdAt: string
}

// What every route that starts a session returns.
export interface AuthSession {
    token: string
    /** ISO-8601. The backend gives sessions seven days. */
    expiresAt: string
    user: User
}

export function login(email: string, password: string): Promise<AuthSession> {
    return request<AuthSession>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

// Creates the account and signs straight into it.
export function signup(name: string, email: string, password: string): Promise<AuthSession> {
    return request<AuthSession>('/api/v1/user', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
    });
}

// Creates a throwaway account and logs straight into it.
export function createGuest(locale?: LanguageCode): Promise<AuthSession> {
    return request<AuthSession>('/api/v1/user/guest', {
        method: 'POST',
        // `locale` and nothing else: the backend decodes with `DisallowUnknownFields`.
        body: JSON.stringify(locale === undefined ? {} : { locale })
    });
}

// Turns the guest this token belongs to into a real account, in place.
export function upgradeGuest(email: string, password: string): Promise<void> {
    return request<void>('/api/v1/user/upgrade', {
        method: 'POST',
        // `email` and `password` and nothing else.
        body: JSON.stringify({ email, password })
    });
}

/** Resolves a stored token back into its user. Throws a 401 if it is no longer valid. */
export function me(): Promise<User> {
    return request<User>('/api/v1/auth/me');
}

/** Revokes the session server-side. Safe to call twice. */
export function logout(): Promise<void> {
    return request<void>('/api/v1/auth/logout', { method: 'POST' });
}
