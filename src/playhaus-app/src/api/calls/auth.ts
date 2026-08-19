import { request } from '@/api/client';
import type { LanguageCode } from '@/constants/languages';

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
    /**
     * The language the account plays in. Set from `Accept-Language` when the
     * account is created, and changed from the profile screen after that.
     *
     * Narrower than the `string` the wire carries, because the backend validates
     * against the same closed list `LANGUAGES` mirrors — anything else would be a
     * value it refused to store.
     */
    locale: LanguageCode
    /**
     * Which swatch in `AVATAR_COLORS`, not a hex — what `lemon` looks like is the
     * app's business. The backend validates against the same list of ids.
     */
    color: string
    enableSounds: boolean
    enableMusic: boolean
    enableVibration: boolean
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
 * The locale is the one thing worth sending. It is not only the account's
 * setting: the backend generates the guest's display name from the word list for
 * that language, so a guest asked in Dutch and a guest asked in English are
 * named differently. Leave it out and the backend falls back to
 * `Accept-Language`, which this client does not send either — so every guest
 * would be Dutch by default.
 */
export function createGuest(locale?: LanguageCode): Promise<AuthSession> {
    return request<AuthSession>('/api/v1/user/guest', {
        method: 'POST',
        // `locale` and nothing else: the backend decodes with
        // `DisallowUnknownFields`, so an extra key is a 400 rather than
        // something quietly ignored.
        body: JSON.stringify(locale === undefined ? {} : { locale })
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
