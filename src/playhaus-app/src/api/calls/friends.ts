import { request } from '@/api/client';

// The social graph. There is no search and no request: you become friends by playing together, and that is the only way in.

export interface Friend {
    userId: string
    name: string
    /** Which swatch in `AVATAR_COLORS`, not a colour — same as on a lobby seat. */
    avatarColorId: string
    // When you first played together.
    friendsSince: string
}

export interface InviteFrom {
    userId: string
    name: string
    avatarColorId: string
}

/** Somebody asking you into a room they are already sitting in. */
export interface FriendInvite {
    id: string
    // The join code to walk into.
    code: string
    game: string
    /** `room` or `tournament`, so the banner can name where it leads without a flash. */
    kind: string
    from: InviteFrom
    // Past this it is an invite into nothing: a lobby is swept after an hour.
    expiresAt: string
    createdAt: string
}

export async function getFriends(): Promise<Friend[]> {
    return await request<Friend[] | null>('/api/v1/friends') ?? [];
}

export async function getInvites(): Promise<FriendInvite[]> {
    return await request<FriendInvite[] | null>('/api/v1/friends/invites') ?? [];
}

export async function inviteFriend(code: string, userId: string): Promise<FriendInvite> {
    return await request<FriendInvite>('/api/v1/friends/invites', {
        method: 'POST',
        body: JSON.stringify({ code, userId })
    });
}

/** Marks invites as shown, which is all dismissing a banner means. The rows stay; they stop being pending. */
export async function markInvitesSeen(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    await request<void>('/api/v1/friends/invites/seen', {
        method: 'POST',
        body: JSON.stringify({ ids })
    });
}
