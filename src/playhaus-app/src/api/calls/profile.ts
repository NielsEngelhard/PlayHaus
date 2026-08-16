import type { User } from '@/api/calls/auth';
import { request } from '@/api/client';

/**
 * A user plus the preferences this page edits.
 *
 * The three preference fields are optional because the API does not serve them
 * yet: the Go `userResponse` carries an id, email, name, `isGuest`, locale and
 * `createdAt`, and nothing behind `updateProfile` exists either. They are
 * declared here rather than on `User` so the type the auth flow depends on
 * stays an honest mirror of what the backend actually sends — when the columns
 * land, they move over and lose their `?`.
 */
export interface Profile extends User {
    /** Which swatch in `AVATAR_COLORS`, not a colour — the hex lives in the app. */
    avatarColorId?: string
    soundEnabled?: boolean
    vibrationEnabled?: boolean
}

/**
 * A partial edit. Everything is optional: the profile page saves one toggle far
 * more often than it saves the whole page, and a field left out is left alone
 * rather than cleared.
 */
export interface ProfileUpdate {
    name?: string
    avatarColorId?: string
    soundEnabled?: boolean
    vibrationEnabled?: boolean
}

/**
 * Writes the signed-in account's profile and returns it as it now stands.
 *
 * Which account is the session's, so there is no id to pass. The response is the
 * whole user rather than an acknowledgement, which is what lets the caller
 * replace its state instead of guessing what the server made of the edit.
 *
 * No route answers this yet — the backend has no writable profile — so every
 * call 404s and `useProfile` rolls the edit back. Left in place, and pointed at
 * where the route belongs, rather than deleted along with the page it serves.
 */
export function updateProfile(update: ProfileUpdate): Promise<Profile> {
    return request<Profile>('/api/v1/auth/me', {
        method: 'PUT',
        body: JSON.stringify(update)
    });
}
