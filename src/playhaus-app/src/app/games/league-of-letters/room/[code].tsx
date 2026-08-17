import { roundOf } from "@/api/calls/league-of-letters";
import { useFullScreen } from "@/components/layout/FullScreenContext";
import { Spacing } from "@/constants/theme";
import LobbyView from "@/features/league-of-letters/components/LobbyView";
import MockStateSwitcher from "@/features/league-of-letters/components/MockStateSwitcher";
import PlayingGame from "@/features/league-of-letters/components/PlayingGame";
import {
    DEFAULT_MULTIPLAYER_SNAPSHOT,
    MOCK_MULTIPLAYER_GAMES,
    MOCK_USER_ID,
    snapshotById
} from "@/features/league-of-letters/mock-games";
import { useLobby } from "@/features/league-of-letters/useLobby";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

/**
 * A room, joined by its code.
 *
 * Two screens in one, and which one you get is the room's own business: while the lobby
 * is waiting this is the lobby, and the moment the host starts — which a guest finds out
 * about through `useLobby`'s poll — it becomes the board. The host arrives here already
 * on the second half, having started the game on the way over.
 *
 * TODO: the game is still a fixture. The lobby above it is real enough to join, leave
 * and start, but there is no endpoint that turns a started lobby into a game, so
 * `lobby.gameId` is not read and the board opens on a hand-written round instead.
 */
export default function LeagueOfLettersRoomPage() {
    const { code } = useLocalSearchParams<{ code: string }>();
    const state = useLobby(code);

    // `useFullScreen` lives in `RoomGame` rather than here: a board has to fit the window
    // exactly, and a lobby is a column of cards that wants the ordinary scrolling page
    // and the bottom bar. A hook cannot be called for one and not the other, so the
    // board is its own component.
    if (state.lobby?.status === 'started') {
        return <RoomGame />;
    }

    return (
        <LobbyView
            state={state}
            // Nothing to do: this screen is already the room the game started in, and the
            // status it started with is what swaps the board in above.
            onStarted={() => { }}
        />
    )
}

/** The multiplayer board: the same one solo plays on, plus a clock and a scoreboard. */
function RoomGame() {
    useFullScreen();

    const [snapshotId, setSnapshotId] = useState(DEFAULT_MULTIPLAYER_SNAPSHOT);

    const snapshot = snapshotById(MOCK_MULTIPLAYER_GAMES, snapshotId);
    const game = snapshot.game;
    const round = roundOf(game, game.currentRound);

    // Every fixture carries the round it is a snapshot of, so this is unreachable —
    // but the board cannot draw without one, and narrowing here is cheaper than
    // teaching it to.
    if (round === undefined) return null;

    return (
        <View style={styles.page}>
            <MockStateSwitcher snapshots={MOCK_MULTIPLAYER_GAMES} value={snapshotId} onChange={setSnapshotId} />

            <PlayingGame game={game} round={round} userId={MOCK_USER_ID} />
        </View>
    )
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        width: '100%',
        gap: Spacing.two
    }
})
