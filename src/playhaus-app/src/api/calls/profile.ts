import type { User } from '@/api/calls/auth';
import { request } from '@/api/client';

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
 */
export function updateProfile(update: ProfileUpdate): Promise<User> {
    return request<User>('/api/v1/me', {
        method: 'PUT',
        body: JSON.stringify(update)
    });
}
