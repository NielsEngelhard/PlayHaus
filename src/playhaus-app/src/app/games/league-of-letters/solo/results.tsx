import type { GamePlayer } from "@/api/calls/league-of-letters";
import LoadingPage from "@/components/layout/LoadingPage";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import BackButton from "@/components/ui/BackButton";
import Confetti from "@/components/ui/Confetti";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import FinalScoreboard from "@/features/league-of-letters/components/FinalScoreboard";
import { useGame } from "@/features/league-of-letters/useGame";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";

/**
 * The end of a game: who played, what they scored, and the two things there are to
 * do about it.
 *
 * Its own page rather than a panel on the board, so the board can be replaced in
 * history the moment the last round closes — a finished game is not somewhere the
 * back button should be able to return to, and the keyboard and grid have no reason
 * to stay mounted under a result.
 *
 * `useFullScreen` is deliberately not called. The board claims the viewport because
 * it has a keyboard that must sit on the bottom edge; a scoreboard is an ordinary
 * page and wants the scroll and the bottom bar back.
 */
export default function LeagueOfLettersResultsPage() {
    const theme = useTheme();
    const styles = useStyles();

    const router = useRouter();
    const { user } = useAuth();
    const { gameId } = useLocalSearchParams<{ gameId: string }>();

    // Fetched rather than handed over from the board. The score is the server's to
    // decide, and refetching is what makes this page survive being opened cold —
    // from a link, or from a reload on web.
    const { game, loading, error, reload } = useGame(gameId);

    /**
     * Who to list.
     *
     * `players` only ever arrives on the mocked multiplayer room; a solo game is one
     * player the response never names, because the only person who can read the game
     * is the one who owns it. So the row is built from the session — which is where
     * the name and the avatar live anyway — and the score off the game.
     */
    const players = useMemo<GamePlayer[]>(() => {
        if (game === null) return [];
        if (game.players !== undefined) return game.players;
        if (user === null) return [];

        return [{
            userId: user.id,
            name: user.name,
            avatarColorId: user.color,
            score: game.score,
            joinedAt: game.createdAt
        }];
    }, [game, user]);

    if (loading) {
        return <LoadingPage message='Uitslag laden…' />;
    }

    // No game and no players are the same dead end: there is no result to show, so
    // the page offers the retry and the way out instead of an empty table.
    if (game === null || players.length === 0) {
        return (
            <View style={styles.failed}>
                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title='Mislukt'
                    message={error ?? 'De uitslag kon niet worden geladen.'}
                />

                <TextButton text='Opnieuw' onPress={reload} variant='primary' fullWidth />

                <BackButton href={ROUTES.leagueOfLettersIndex} />
            </View>
        );
    }

    const rounds = game.totalRounds === 1 ? '1 ronde' : `${game.totalRounds} rondes`;

    /**
     * Something went right. Paper for every game regardless of how it went would be
     * the app congratulating someone on losing three rounds in a row, so it is held
     * back for a game with at least one word landed in it.
     */
    const won = game.rounds.some(round => round.guesses.some(guess =>
        guess.userId === user?.id && guess.marks.every(mark => mark === 'correct')));

    return (
        <View style={styles.page}>
            <View style={styles.body}>
                <SimpleTextHero
                    title='Spel afgelopen'
                    description={`${rounds} van ${game.wordLength} letters gespeeld.`}
                />

                <FinalScoreboard players={players} userId={user?.id ?? ''} />

                {/* Straight to the settings screen rather than to a new game: the word
                    length and language are the whole of what a solo game is, and the
                    end of one is the natural moment to change them. `replace`, so the
                    finished game is not left behind the next one. */}
                <TextButton
                    text='Nog een keer'
                    fullWidth
                    onPress={() => router.replace(ROUTES.leagueOfLettersSoloSettings)}
                    style={styles.again}
                />

                {/* A `Link`, so on web it is a real anchor. It is also the only way out
                    that does not start another game. */}
                <BackButton
                    href={ROUTES.leagueOfLettersIndex}
                    label='Terug naar de spellen'
                    variant='neutral'
                    style={styles.back}
                />
            </View>

            {/* Last, so it falls in front of everything. It takes no room and no
                touches, so the buttons underneath keep working while it comes down —
                and it rains once on arrival rather than for as long as it is on. */}
            <Confetti active={won} />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    page: {
        width: '100%'
    },
    body: {
        marginTop: Spacing.four,
        gap: Spacing.four
    },
    again: {
        backgroundColor: theme.colors.primary
    },
    // Trimmed back from the margin the button carries by default: the gap on `body`
    // is already holding it off the button above it.
    back: {
        marginVertical: 0,
        alignSelf: 'stretch'
    },
    failed: {
        width: '100%',
        gap: Spacing.four,
        paddingTop: Spacing.four,
        alignItems: 'flex-start'
    }
}))
