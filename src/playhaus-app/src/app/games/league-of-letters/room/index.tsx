import { ROUTES } from "@/constants/routes";
import CurrentRoomGuard from "@/features/league-of-letters/components/CurrentRoomGuard";
import LobbyView from "@/features/league-of-letters/components/LobbyView";
import { useLobby } from "@/features/league-of-letters/useLobby";
import { RelativePathString, useRouter } from "expo-router";

// Opening a multiplayer room — after checking there is not already one open.
export default function LeagueOfLettersCreateRoomPage() {
    return (
        <CurrentRoomGuard>
            <OpenRoom />
        </CurrentRoomGuard>
    )
}

// The room itself.
function OpenRoom() {
    const router = useRouter();

    // No code: this player is opening a room rather than joining one, which makes them its host.
    const state = useLobby();

    return (
        <LobbyView
            state={state}
            // `replace`, not `push`: the lobby this screen was is gone the moment the game starts.
            onStarted={lobby => router.replace(
                ROUTES.leagueOfLettersRoom(lobby.code) as RelativePathString
            )}
        />
    )
}
