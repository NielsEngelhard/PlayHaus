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

// A solo game in progress.
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

    // A game with no round to show is as unplayable as one that would not load.
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
                // Solo has no roster to read a name off, so the account is the player.
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
        // Sits near the top rather than filling the screen.
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.four,
        alignItems: 'flex-start'
    }
}))
