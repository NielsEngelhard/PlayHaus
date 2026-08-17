import LobbyView from "@/features/league-of-letters/components/LobbyView";
import { useLobby } from "@/features/league-of-letters/useLobby";
import { ROUTES } from "@/constants/routes";
import { RelativePathString, useRouter } from "expo-router";

/**
 * Opens a multiplayer room and waits in it.
 *
 * The room exists from the moment this screen is on: `useLobby` creates it on mount, so
 * there is a code to show and share immediately rather than after a form. That is also
 * why leaving matters — the room is given back when this screen goes, which `useLobby`
 * takes care of and the way out on `LobbyView` asks about first.
 *
 * The one exit that keeps it is starting the game, which is what `onStarted` is.
 */
export default function LeagueOfLettersCreateRoomPage() {
    const router = useRouter();

    // No code: this player is opening a room rather than joining one, which makes them
    // its host.
    const state = useLobby();

    return (
        <LobbyView
            state={state}
            // `replace`, not `push`: the lobby this screen was is gone the moment the
            // game starts, and going back to it would open a second empty room.
            onStarted={lobby => router.replace(
                ROUTES.leagueOfLettersRoom(lobby.code) as RelativePathString
            )}
        />
    )
}
