import { useChromeless } from '@/components/layout/FullScreenContext';
import LoadingPage from '@/components/layout/LoadingPage';
import BackButton from '@/components/ui/BackButton';
import InlineNotification from '@/components/ui/InlineNotification';
import TextButton from '@/components/ui/TextButton';
import { accentOf, LEAGUE_OF_LETTERS } from '@/constants/games';
import { ROUTES } from '@/constants/routes';
import { Spacing } from '@/constants/theme';
import { useT, useUiLanguage } from '@/features/i18n/LanguageContext';
import DailyCalendarCard from '@/features/league-of-letters/components/DailyCalendarCard';
import DailyPlayCard from '@/features/league-of-letters/components/DailyPlayCard';
import DailyStatsRow from '@/features/league-of-letters/components/DailyStatsRow';
import DailyTodayCard from '@/features/league-of-letters/components/DailyTodayCard';
import WordOfTheDayHero from '@/features/league-of-letters/components/WordOfTheDayHero';
import { useWordOfTheDay } from '@/features/league-of-letters/useWordOfTheDay';
import { dayTitle, monthTitle, untilReset } from '@/features/league-of-letters/word-of-the-day';
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

// The month of days behind today's word: the calendar, how today went, and the numbers it moved.
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

    // Today's own box in the calendar, which is what the result card reads.
    const done = today.month.find(day => day.day === today.day);
    const word = game?.rounds[0]?.word;

    // There is still a board to walk into: either the day has not been started or it was left half played.
    const open = today.playable || game?.status !== 'completed';

    return (
        <AccentProvider accent={accentOf(LEAGUE_OF_LETTERS)}>
            <View style={styles.screen}>
                <WordOfTheDayHero
                    eyebrow={t('lol.wordOfTheDay.eyebrow')}
                    title={monthTitle(today.day, language)}
                    back={ROUTES.leagueOfLettersIndex}
                    onBack={() => router.replace(ROUTES.leagueOfLettersIndex)}
                    streak={today.streak}
                    streakLabel={t('lol.wordOfTheDay.streakDays', { days: today.streak })}
                />

                <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                    <View style={styles.body}>
                        <DailyCalendarCard month={today.month} today={today.day} maxGuesses={today.maxGuesses} />

                        {error !== null && (
                            <InlineNotification
                                icon='alert-triangle'
                                color={theme.colors.blush}
                                message={t(error)}
                            />
                        )}

                        {open || done === undefined ? (
                            <DailyPlayCard
                                title={today.playable
                                    ? t('lol.wordOfTheDay.playDay', { day: dayTitle(today.day, language) })
                                    : t('lol.wordOfTheDay.resume')}
                                subtitle={t('lol.wordOfTheDay.playHint', { letters: today.wordLength })}
                                onPress={today.playable ? begin : openBoard}
                                disabled={starting}
                            />
                        ) : (
                            <DailyTodayCard
                                today={done}
                                stats={today.stats}
                                word={word}
                                resetsIn={untilReset(now, today.resetsAt)}
                            />
                        )}

                        <DailyStatsRow stats={today.stats} />
                    </View>
                </ScrollView>
            </View>
        </AccentProvider>
    )
}

const useStyles = createThemedStyles(() => ({
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

    failed: {
        width: '100%',
        gap: Spacing.four,
        // Sits near the top rather than filling the screen.
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.four,
        alignItems: 'flex-start'
    }
}))
