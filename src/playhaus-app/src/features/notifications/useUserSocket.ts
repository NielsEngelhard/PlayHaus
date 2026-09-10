import { userRoom, type UserServerEvent } from '@/api/user-socket';
import type { SocketStatus } from '@/api/socket';
import { useAuth } from '@/features/auth/useAuth';
import { useRoomSocket } from '@/features/realtime/useRoomSocket';

// The personal room, held open for as long as somebody is signed in. Deliberately not a `room-holds` lease: that refcounts screens sitting on a join code, and this is not one.
export function useUserSocket(onEvent: (event: UserServerEvent) => void): SocketStatus {
    const { status, user } = useAuth();

    // Gated on the auth status rather than the id alone, so the effect re-runs once the stored token is restored and tears down again on logout.
    const { status: connection } = useRoomSocket<UserServerEvent, never>({
        room: user === null ? undefined : userRoom(user.id),
        enabled: status === 'signedIn',
        onEvent
    });

    return connection;
}
