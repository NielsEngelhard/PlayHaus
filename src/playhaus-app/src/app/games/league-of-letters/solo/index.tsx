import { useFullScreen } from "@/components/layout/FullScreenContext";
import { useHeaderTag } from "@/components/layout/HeaderTagContext";
import { LEAGUE_OF_LETTERS_NAME } from "@/constants/games";
import { Spacing } from "@/constants/theme";
import MockStateSwitcher from "@/features/league-of-letters/components/MockStateSwitcher";
import PlayingGame from "@/features/league-of-letters/components/PlayingGame";
import {
    DEFAULT_SOLO_SNAPSHOT,
    MOCK_SOLO_GAMES,
    MOCK_USER_ID,
    parseWordLength,
    snapshotById,
    withSettings
} from "@/features/league-of-letters/mock-games";
import type { LanguageCode } from "@/features/league-of-letters/solo-settings";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

/**
 * A solo game in progress. No clock and nobody else on screen — that is the whole of
 * what makes it solo; the board and keyboard are the same ones multiplayer uses.
 *
 * TODO: the game is a fixture. `gameId` is handed over by the settings screen but cannot
 * be used for anything until `GET /api/v1/league-of-letters/games/{id}` exists.
 */
export default function LeagueOfLettersSoloPage() {
    useHeaderTag(LEAGUE_OF_LETTERS_NAME);
    useFullScreen();

    const { lang, length } = useLocalSearchParams<{
        gameId: string,
        lang: string,
        length: string
    }>();

    const [snapshotId, setSnapshotId] = useState(DEFAULT_SOLO_SNAPSHOT);

    const game = withSettings(
        snapshotById(MOCK_SOLO_GAMES, snapshotId).game,
        parseWordLength(length),
        lang as LanguageCode | undefined
    );

    return (
        <View style={styles.page}>
            <MockStateSwitcher snapshots={MOCK_SOLO_GAMES} value={snapshotId} onChange={setSnapshotId} />

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
