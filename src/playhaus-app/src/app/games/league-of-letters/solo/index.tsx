import { useFullScreen } from "@/components/layout/FullScreenContext";
import { useHeaderTag } from "@/components/layout/HeaderTagContext";
import LoadingPage from "@/components/layout/LoadingPage";
import BackButton from "@/components/ui/BackButton";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { LEAGUE_OF_LETTERS_NAME } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { Colors, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import PlayingGame from "@/features/league-of-letters/components/PlayingGame";
import { useGame } from "@/features/league-of-letters/useGame";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

/**
 * A solo game in progress.
 *
 * No clock and nobody else on screen — that is the whole of what makes it solo.
 * The board and keyboard are the same ones a multiplayer room uses.
 *
 * The word length and language are not read from the route: the game is fetched
 * by id and carries its own, which are what the server actually made rather than
 * what the settings screen asked for.
 */
export default function LeagueOfLettersSoloPage() {
    useHeaderTag(LEAGUE_OF_LETTERS_NAME);
    useFullScreen();

    const { user } = useAuth();
    const { gameId } = useLocalSearchParams<{ gameId: string }>();
    const { game, loading, error, reload, guess } = useGame(gameId);

    if (loading) {
        return <LoadingPage message='Spel laden…' />;
    }

    if (game === null || user === null) {
        return (
            <View style={styles.failed}>
                <InlineNotification
                    icon='alert-triangle'
                    color={Colors.light.blush}
                    title='Mislukt'
                    message={error ?? 'Dit spel kon niet worden geladen.'}
                />

                <TextButton text='Opnieuw' onPress={reload} variant='primary' fullWidth />

                <BackButton href={ROUTES.leagueOfLettersIndex} />
            </View>
        );
    }

    return <PlayingGame game={game} userId={user.id} onGuess={guess} />;
}

const styles = StyleSheet.create({
    failed: {
        width: '100%',
        gap: Spacing.four,
        // Sits below the header rather than filling the screen: there is no board
        // to centre, and a lone message floating mid-page reads as a crash.
        paddingTop: Spacing.four,
        alignItems: 'flex-start'
    }
})
