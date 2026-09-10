import { useChromeless } from '@/components/layout/FullScreenContext';
import LoadingPage from '@/components/layout/LoadingPage';
import AppText from '@/components/text/AppText';
import ActionButton from '@/components/ui/ActionButton';
import BackButton from '@/components/ui/BackButton';
import InlineNotification from '@/components/ui/InlineNotification';
import TextButton from '@/components/ui/TextButton';
import { accentOf, LEAGUE_OF_LETTERS } from '@/constants/games';
import { ROUTES } from '@/constants/routes';
import { Spacing } from '@/constants/theme';
import { useT, useUiLanguage } from '@/features/i18n/LanguageContext';
import DailyBestCard from '@/features/league-of-letters/components/DailyBestCard';
import DailyFriendsCard from '@/features/league-of-letters/components/DailyFriendsCard';
import StreakCard from '@/features/league-of-letters/components/StreakCard';
import WordOfTheDayHero from '@/features/league-of-letters/components/WordOfTheDayHero';
import { useWordOfTheDay } from '@/features/league-of-letters/useWordOfTheDay';
import { dayTitle, MOCK_FRIENDS, untilReset } from '@/features/league-of-letters/word-of-the-day';
import { AccentProvider } from '@/features/theme/AccentContext';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useTheme } from '@/features/theme/ThemeContext';
import { useNow } from '@/hooks/useNow';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

// How often the countdown to the next word is re-read, which is fine at half a minute for a clock drawn to the minute.
const TICK_MS = 30_000;

// How far the cards climb over the hero's bottom edge.
const OVERLAP = 18;

// Today's word: the streak it feeds, the best day to beat, and the one attempt going in.
export default function LeagueOfLettersWordOfTheDayPage() {
    const theme = useTheme();
    const styles = useStyles();

    useChromeless();

    const router = useRouter();
    const t = useT();
    const language = useUiLanguage();

    const { today, game, loading, error, starting, reload, start } = useWordOfTheDay();
    const now = useNow(TICK_MS);

    if (loading) {
        return <LoadingPage message={t('lol.game.loading')} />;
    }

    if (today === null) {
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

    const openBoard = () => router.push(ROUTES.leagueOfLettersWordOfTheDayPlay);

    const begin = async () => {
        if (await start()) openBoard();
    };

    // Today's own row in the history, which is what the result line reads.
    const done = today.history[today.history.length - 1];
    const word = game?.rounds[0]?.word;

    // There is still a board to walk into: either the day has not been started or it was left half played.
    const open = today.playable || game?.status !== 'completed';

    return (
        <AccentProvider accent={accentOf(LEAGUE_OF_LETTERS)}>
            <View style={styles.screen}>
                <WordOfTheDayHero
                    eyebrow={t('lol.wordOfTheDay.eyebrow')}
                    title={dayTitle(today.day, language)}
                    onBack={() => router.replace(ROUTES.leagueOfLettersIndex)}
                    backLabel={t('common.back')}
                />

                <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                    <View style={styles.body}>
                        <StreakCard streak={today.streak} history={today.history} />

                        <DailyBestCard stats={today.stats} />

                        {error !== null && (
                            <InlineNotification
                                icon='alert-triangle'
                                color={theme.colors.blush}
                                message={t(error)}
                            />
                        )}

                        {open ? (
                            <View style={styles.cta}>
                                <ActionButton
                                    text={t(today.playable ? 'lol.wordOfTheDay.start' : 'lol.wordOfTheDay.resume')}
                                    onPress={today.playable ? begin : openBoard}
                                    disabled={starting}
                                    size='large'
                                />

                                <AppText style={styles.caption}>
                                    {t('lol.wordOfTheDay.caption', { letters: today.wordLength })}
                                </AppText>
                            </View>
                        ) : (
                            <View style={styles.done}>
                                <AppText style={styles.doneTitle}>{t('lol.wordOfTheDay.comeBackTitle')}</AppText>

                                <AppText style={styles.doneLine}>
                                    {done.solved
                                        ? t(done.guesses === 1 ? 'lol.wordOfTheDay.solvedInOne' : 'lol.wordOfTheDay.solvedInMany', { guesses: done.guesses })
                                        : t('lol.wordOfTheDay.notSolved', { word: (word ?? '').toUpperCase() })}
                                </AppText>

                                <AppText style={styles.doneNext}>
                                    {t('lol.wordOfTheDay.nextWord', { time: untilReset(now, today.resetsAt) })}
                                </AppText>

                                <TextButton text={t('lol.wordOfTheDay.viewBoard')} onPress={openBoard} fullWidth />
                            </View>
                        )}

                        <DailyFriendsCard friends={MOCK_FRIENDS} />
                    </View>
                </ScrollView>
            </View>
        </AccentProvider>
    )
}

const useStyles = createThemedStyles(theme => ({
    screen: {
        flex: 1,
        width: '100%'
    },

    // Pulled up under the hero's rounded edge: the overlap belongs to the scroller, since a negative margin inside it would be clipped away instead.
    scroll: {
        width: '100%',
        marginTop: -OVERLAP
    },

    // The design's gutters.
    body: {
        gap: 12,
        paddingHorizontal: 15,
        paddingBottom: 15
    },

    cta: {
        gap: 7
    },

    done: {
        gap: 7,
        padding: 13,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.popShadow(theme.colors.shadow)
    },

    doneTitle: {
        fontSize: 15,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },

    doneLine: {
        fontSize: 12.5,
        fontWeight: 800,
        color: theme.colors.textSecondary
    },

    doneNext: {
        fontSize: 11.5,
        fontWeight: 800,
        color: theme.colors.textMuted
    },

    caption: {
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 800,
        color: theme.colors.textSecondary
    },

    failed: {
        width: '100%',
        gap: Spacing.four,
        // Sits near the top rather than filling the screen.
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.four,
        alignItems: 'flex-start'
    }
}))
