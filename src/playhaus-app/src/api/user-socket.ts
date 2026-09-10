import type { FriendInvite } from '@/api/calls/friends';

// The socket half of the personal room: one per player, for what reaches them between games.

/** A room is `namespace:id`. The server rewrites the id to whoever is holding the token, so this can only ever be your own. */
export function userRoom(userId: string): string {
    return `user:${userId}`;
}

export type UserServerEvent =
    /** A friend asking you into a room. The invite is already stored — this only means "fetch now". */
    | { type: 'invite', data: FriendInvite }
    /** Sent to whoever has just arrived: anything published while they were away is waiting in a row, so it means "fetch now" too. */
    | { type: 'sync', data: null }
    | { type: 'error', data: { message: string } };
