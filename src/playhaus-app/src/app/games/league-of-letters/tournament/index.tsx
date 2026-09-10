import { ROUTES } from "@/constants/routes";
import CurrentRoomGuard from "@/features/league-of-letters/components/CurrentRoomGuard";
import LobbyView from "@/features/league-of-letters/components/LobbyView";
import { useLobby } from "@/features/league-of-letters/useLobby";
import { RelativePathString, useRouter } from "expo-router";

// Setting up a tournament: the same waiting room, twelve seats wide.
export default function LeagueOfLettersTournamentPage() {
    return (
        <CurrentRoomGuard>
            <OpenTournament />
        </CurrentRoomGuard>
    )
}

function OpenTournament() {
    const router = useRouter();

    // No code: this player is opening the room rather than joining it, which makes them its host.
    const state = useLobby(undefined, 'tournament');

    return (
        <LobbyView
            state={state}
            // The bracket lives on the room's own screen, which this one has no code in its URL to be.
            onStarted={lobby => router.replace(
                ROUTES.leagueOfLettersTournamentRoom(lobby.code) as RelativePathString
            )}
        />
    )
}
