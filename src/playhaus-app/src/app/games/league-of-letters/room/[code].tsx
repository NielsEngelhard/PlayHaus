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
import { useLocalSearchParams } from "expo-router";
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

    const { code } = useLocalSearchParams<{ code: string }>();

    const [snapshotId, setSnapshotId] = useState(DEFAULT_MULTIPLAYER_SNAPSHOT);

    const snapshot = snapshotById(MOCK_MULTIPLAYER_GAMES, snapshotId);
    // The typed code is the one thing on this screen that is really the player's.
    const game = { ...snapshot.game, code: code ?? snapshot.game.code };

    return (
        <View style={styles.page}>
            <MockStateSwitcher snapshots={MOCK_MULTIPLAYER_GAMES} value={snapshotId} onChange={setSnapshotId} />

            <PlayingGame game={game} userId={MOCK_USER_ID} />
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
