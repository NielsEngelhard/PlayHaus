import type { User } from '@/api/calls/auth';
import { request } from '@/api/client';

export interface Profile extends User {
    /** Which swatch in `AVATAR_COLORS`, not a colour — the hex lives in the app. */
    avatarColorId?: string
    soundEnabled?: boolean
    vibrationEnabled?: boolean
}

export function updateUsername(username: string): Promise<null> {
    return request<null>('/api/v1/user/username', {
        method: 'PUT',
        body: JSON.stringify({
            username: username
        })
    })
}