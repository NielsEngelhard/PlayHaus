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
import FinalScoreboard from "@/components/ui/FinalScoreboard";
import { useGame } from "@/features/league-of-letters/useGame";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useT } from "@/features/i18n/LanguageContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";

// The end of a game: who played, what they scored, and the two things there are to do about it.
export default function LeagueOfLettersResultsPage() {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    const router = useRouter();
    const { user } = useAuth();
    const { gameId } = useLocalSearchParams<{ gameId: string }>();

    // Fetched rather than handed over from the board.
    const { game, loading, error, reload } = useGame(gameId);

    // Who to list.
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
        return <LoadingPage message={t('lol.results.loading')} />;
    }

    // No game and no players are the same dead end.
    if (game === null || players.length === 0) {
        return (
            <View style={styles.failed}>
                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title={t('common.failed')}
                    message={error === null ? t('lol.results.loadFailed') : t(error)}
                />

                <TextButton text={t('common.retry')} onPress={reload} variant='primary' fullWidth />

                <BackButton href={ROUTES.leagueOfLettersIndex} />
            </View>
        );
    }

    // Something went right.
    const won = game.rounds.some(round => round.guesses.some(guess =>
        guess.userId === user?.id && guess.marks.every(mark => mark === 'correct')));

    return (
        <View style={styles.page}>
            <View style={styles.body}>
                <SimpleTextHero
                    title={t('lol.results.title')}
                    // Label and value rather than a counted noun.
                    description={t('lol.results.summary', {
                        rounds: game.totalRounds,
                        length: game.wordLength
                    })}
                />

                <FinalScoreboard players={players} userId={user?.id ?? ''} />

                {/* Straight to the settings screen rather than to a new game. */}
                <TextButton
                    text={t('lol.results.again')}
                    fullWidth
                    onPress={() => router.replace(ROUTES.leagueOfLettersSoloSettings)}
                    style={styles.again}
                />

                {/* A `Link`, so on web it is a real anchor. */}
                <BackButton
                    href={ROUTES.leagueOfLettersIndex}
                    label={t('common.backToGames')}
                    variant='neutral'
                    style={styles.back}
                />
            </View>

            {/* Last, so it falls in front of everything. */}
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
    // Trimmed back from the margin the button carries by default.
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
