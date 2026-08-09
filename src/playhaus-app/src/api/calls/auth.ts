import { request } from '@/api/client';

/** A user as the API describes it. Mirrors `app_user.UserResponse` in the Go backend. */
export interface User {
    id: string
    /** Absent on guests, who never supply one. */
    email?: string
    name: string
    isGuestAccount: boolean
    createdAt: string
}

/**
 * What every route that starts a session returns. The token is the session —
 * store it, send it as a bearer token, and drop it on logout.
 */
export interface AuthSession {
    token: string
    /** ISO-8601. The backend gives sessions seven days. */
    expiresAt: string
    user: User
}

export function login(email: string, password: string): Promise<AuthSession> {
    return request<AuthSession>('/api/v1/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

/**
 * Creates the account only — signup does not start a session, so callers log in
 * afterwards with the same credentials. Kept separate on the backend so the
 * password is verified by exactly one code path.
 */
export function signup(name: string, email: string, password: string): Promise<User> {
    return request<User>('/api/v1/user', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, isGuestAccount: false })
    });
}

/**
 * Creates a throwaway account and logs straight into it. A guest has no password,
 * so this token is the only way back in — losing it loses the account.
 *
 * Pass no name to have the backend generate one.
 */
export function createGuest(name?: string): Promise<AuthSession> {
    return request<AuthSession>('/api/v1/guest', {
        method: 'POST',
        body: JSON.stringify({ name: name ?? '' })
    });
}

/** Resolves a stored token back into its user. Throws a 401 if it is no longer valid. */
export function me(): Promise<User> {
    return request<User>('/api/v1/me');
}

/** Revokes the session server-side. Safe to call twice. */
export function logout(): Promise<void> {
    return request<void>('/api/v1/logout', { method: 'POST' });
}
