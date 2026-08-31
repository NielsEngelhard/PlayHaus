import { useChromeless } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import BackButton from "@/components/ui/BackButton";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import PlayingGame from "@/features/league-of-letters/components/PlayingGame";
import { useGame } from "@/features/league-of-letters/useGame";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useT } from "@/features/i18n/LanguageContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";

/**
 * A solo game in progress.
 *
 * No deadline and nobody else on screen — that is the whole of what makes it solo. The
 * board and keyboard are the same ones a multiplayer room uses, and so is the clock above
 * them, except that this one counts up from when the game was made rather than down to
 * somebody's turn running out.
 *
 * `useChromeless` is why the board carries the music and theme buttons itself: the app's
 * header is not on this screen, and those two are the only part of it worth having while
 * a round is being played.
 *
 * The word length and language are not read from the route: the game is fetched
 * by id and carries its own, which are what the server actually made rather than
 * what the settings screen asked for.
 */
export default function LeagueOfLettersSoloPage() {
    const theme = useTheme();
    const styles = useStyles();

    useChromeless();

    const router = useRouter();
    const t = useT();
    const { user } = useAuth();
    const { gameId } = useLocalSearchParams<{ gameId: string }>();
    const { game, round, loading, error, reload, guess, nextRound } = useGame(gameId);

    if (loading) {
        return <LoadingPage message={t('lol.game.loading')} />;
    }

    // A game with no round to show is as unplayable as one that would not load, so
    // it gets the same page rather than a board with nothing on it.
    if (game === null || round === null || user === null) {
        return (
            <View style={styles.failed}>
                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title={t('common.failed')}
                    message={error === null ? t('lol.game.loadFailed') : t(error)}
                />

                <TextButton text={t('common.retry')} onPress={reload} variant='primary' fullWidth />

                <BackButton href={ROUTES.leagueOfLettersIndex} />
            </View>
        );
    }

    return (
        (!game || !round || loading) ? (
            <LoadingPage />
        ) : (
            <PlayingGame
                game={game}
                round={round}
                userId={user.id}
                // Solo has no roster to read a name off, so the account is the player:
                // there is exactly one of them, and it is whoever is signed in.
                player={{ name: user.name, avatarColorId: user.color }}
                onGuess={guess}
                onNextRound={nextRound}
                onFinish={() => router.replace({
                    pathname: ROUTES.leagueOfLettersSoloResults,
                    params: { gameId: game.id }
                })}
            />
        )
    );
}

const useStyles = createThemedStyles(theme => ({
    failed: {
        width: '100%',
        gap: Spacing.four,
        // Sits near the top rather than filling the screen: there is no board to centre,
        // and a lone message floating mid-page reads as a crash. The gutters are its own,
        // because the page it is on has claimed the chrome — see `useChromeless`.
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.four,
        alignItems: 'flex-start'
    }
}))
