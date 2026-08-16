import { roundOf } from "@/api/calls/league-of-letters";
import { useFullScreen } from "@/components/layout/FullScreenContext";
import { useHeaderTag } from "@/components/layout/HeaderTagContext";
import { LEAGUE_OF_LETTERS_NAME } from "@/constants/games";
import { Spacing } from "@/constants/theme";
import MockStateSwitcher from "@/features/league-of-letters/components/MockStateSwitcher";
import PlayingGame from "@/features/league-of-letters/components/PlayingGame";
import {
    DEFAULT_MULTIPLAYER_SNAPSHOT,
    MOCK_MULTIPLAYER_GAMES,
    MOCK_USER_ID,
    snapshotById
} from "@/features/league-of-letters/mock-games";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

/**
 * A multiplayer game in progress. Same board and keyboard as solo, plus the two things
 * only a shared game has: a clock everyone is racing, and everyone else's score.
 *
 * TODO: the game is a fixture. Joining by `code` needs a join endpoint and a way to read
 * the game back — neither is registered on the API yet, and the room screen has no lobby
 * to fall back to, so this opens straight onto a round already under way.
 */
export default function LeagueOfLettersRoomPage() {
    useHeaderTag(LEAGUE_OF_LETTERS_NAME);
    useFullScreen();

    // The code in the route is not read yet: there is no join endpoint to hand it
    // to, and the fixtures below are the same game whichever room you asked for.
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
            {/* The typed code is the one thing on this screen that is really the
                player's. Nothing is fetched with it yet. */}
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
