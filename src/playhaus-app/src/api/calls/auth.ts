import { request } from '@/api/client';

/**
 * A user as the API describes it. Mirrors `userResponse` in the Go backend's
 * `internal/api/users.go` — keep the two in step.
 */
export interface User {
    id: string
    /**
     * Always present. A guest gets a generated `…@guest.turingsolutions.com`
     * address rather than none at all, so this is not the field to test an
     * account's kind with — `isGuest` is.
     */
    email: string
    name: string
    isGuest: boolean
    /** The language the account plays in, e.g. `nl`. Chosen by the backend. */
    locale: string
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
    return request<AuthSession>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

/**
 * Creates the account and signs straight into it — the response is a session,
 * not just the new user, so the app never has to replay the password it has
 * only just sent.
 *
 * The body carries exactly these three fields: the backend decodes with
 * `DisallowUnknownFields`, so an extra one is a 400 rather than something
 * quietly ignored.
 */
export function signup(name: string, email: string, password: string): Promise<AuthSession> {
    return request<AuthSession>('/api/v1/user', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
    });
}

/**
 * Creates a throwaway account and logs straight into it. A guest has no
 * password, so this token is the only way back in — losing it loses the account.
 *
 * There is nothing to send: the name is generated server-side, and the locale
 * comes from `Accept-Language` when the body does not name one.
 */
export function createGuest(): Promise<AuthSession> {
    return request<AuthSession>('/api/v1/user/guest', {
        method: 'POST',
        body: JSON.stringify({})
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
