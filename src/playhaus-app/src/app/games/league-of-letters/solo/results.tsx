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
import { useHighScores } from "@/features/league-of-letters/useHighScores";
import AppText from "@/components/text/AppText";
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
    const bests = useHighScores();

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

    // The bests are read back rather than carried over from the last guess, so a reload shows the same thing.
    const newBest = game.competitive
        && bests.some(best => best.wordLength === game.wordLength && best.score === game.score);

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

                {/* Zen keeps no score, so it gets neither the breakdown nor a scoreboard. */}
                {game.competitive && (
                    <View style={styles.breakdown}>
                        <ScoreLine label={t('lol.results.baseScore')} value={game.score - game.timeBonus} />

                        <ScoreLine label={t('lol.results.timeBonus')} value={game.timeBonus} />

                        <ScoreLine label={t('lol.results.total')} value={game.score} total />

                        {newBest && (
                            <AppText style={styles.newBest}>
                                {t('lol.results.newHighScore', { letters: game.wordLength })}
                            </AppText>
                        )}
                    </View>
                )}

                {game.competitive && <FinalScoreboard players={players} userId={user?.id ?? ''} />}

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

// One row of the competitive breakdown: what it was for, and what it was worth.
function ScoreLine({ label, value, total = false }: { label: string, value: number, total?: boolean }) {
    const styles = useStyles();

    return (
        <View style={[styles.scoreLine, total && styles.scoreLineTotal]}>
            <AppText style={[styles.scoreLabel, total && styles.scoreLabelTotal]}>{label}</AppText>

            <AppText style={[styles.scoreValue, total && styles.scoreValueTotal]}>{value}</AppText>
        </View>
    );
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
    breakdown: {
        gap: Spacing.two,
        padding: Spacing.three,
        borderRadius: 22,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hard
    },
    scoreLine: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: Spacing.three
    },
    // Ruled off from the two lines it adds up.
    scoreLineTotal: {
        paddingTop: Spacing.two,
        borderTopWidth: theme.borderWidth,
        borderTopColor: theme.colors.borderSubtle
    },
    scoreLabel: {
        fontSize: 14,
        fontWeight: 600,
        color: theme.colors.textMuted
    },
    scoreLabelTotal: {
        fontWeight: 800,
        color: theme.colors.text
    },
    scoreValue: {
        fontSize: 18,
        fontWeight: 800,
        fontVariant: ['tabular-nums'],
        color: theme.colors.text
    },
    scoreValueTotal: {
        fontSize: 26,
        fontWeight: 900
    },
    newBest: {
        fontSize: 13,
        fontWeight: 800,
        color: theme.colors.available
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
