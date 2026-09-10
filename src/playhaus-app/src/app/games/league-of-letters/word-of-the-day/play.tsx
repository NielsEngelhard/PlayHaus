import { useChromeless } from '@/components/layout/FullScreenContext';
import LoadingPage from '@/components/layout/LoadingPage';
import BackButton from '@/components/ui/BackButton';
import InlineNotification from '@/components/ui/InlineNotification';
import TextButton from '@/components/ui/TextButton';
import { ROUTES } from '@/constants/routes';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/useAuth';
import { useT } from '@/features/i18n/LanguageContext';
import PlayingGame from '@/features/league-of-letters/components/PlayingGame';
import { useWordOfTheDay } from '@/features/league-of-letters/useWordOfTheDay';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useTheme } from '@/features/theme/ThemeContext';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

// The day's board: one word, six guesses, no clock.
export default function LeagueOfLettersWordOfTheDayBoardPage() {
    const theme = useTheme();
    const styles = useStyles();

    useChromeless();

    const router = useRouter();
    const t = useT();
    const { user } = useAuth();
    const { game, round, loading, error, reload, guess } = useWordOfTheDay();

    if (loading) {
        return <LoadingPage message={t('lol.game.loading')} />;
    }

    // A day nobody has started has no board to show, which reads the same as one that would not load.
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

                <BackButton href={ROUTES.leagueOfLettersWordOfTheDay} />
            </View>
        );
    }

    return (
        <PlayingGame
            game={game}
            round={round}
            userId={user.id}
            // The day has no roster to read a name off, so the account is the player.
            player={{ name: user.name, avatarColorId: user.color }}
            onGuess={guess}
            // Back to the landing page, where the streak and the stats are now a day further on.
            onFinish={() => router.replace(ROUTES.leagueOfLettersWordOfTheDay)}
        />
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
