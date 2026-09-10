import type { DailyDay, DailyStats } from '@/api/calls/league-of-letters';
import AppText from '@/components/text/AppText';
import { Brand } from '@/constants/theme';
import { useT } from '@/features/i18n/LanguageContext';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

interface Props {
    /** Today's own box in the calendar, which is what the line reads. */
    today: DailyDay,
    stats: DailyStats,
    /** The answer, told only once the day is over. */
    word: string | undefined,
    /** How long today's word has left, as hh:mm. */
    resetsIn: string
}

const TILE_SIZE = 44;

// The day just played, as the one card the page is built around.
export default function DailyTodayCard({ today, stats, word, resetsIn }: Props) {
    const styles = useStyles();
    const t = useT();

    const best = stats.bestGuesses;

    return (
        <View style={[styles.card, today.solved ? styles.solved : styles.missed]}>
            <View style={styles.tile}>
                {today.solved
                    ? <AppText style={styles.guesses}>{today.guesses}</AppText>
                    : <Feather name='x' size={19} color={Brand.ink} />}
            </View>

            <View style={styles.lines}>
                <AppText style={styles.headline}>
                    {today.solved
                        ? t(today.guesses === 1 ? 'lol.wordOfTheDay.solvedInOne' : 'lol.wordOfTheDay.solvedInMany', { guesses: today.guesses })
                        : t('lol.wordOfTheDay.notSolved', { word: (word ?? '').toUpperCase() })}
                </AppText>

                <AppText style={styles.detail}>
                    {best === 0
                        ? t('lol.wordOfTheDay.nextWord', { time: resetsIn })
                        : t('lol.wordOfTheDay.bestAndNext', { guesses: best, time: resetsIn })}
                </AppText>
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        ...theme.shadows.hard
    },

    // The two fills the day can end on, both pale enough to be read in ink in either scheme.
    solved: {
        backgroundColor: Brand.mint
    },

    missed: {
        backgroundColor: Brand.blush
    },

    tile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent
    },

    guesses: {
        fontSize: 19,
        fontWeight: 900,
        color: Brand.ink
    },

    lines: {
        flex: 1,
        minWidth: 0,
        gap: 1
    },

    headline: {
        fontSize: 15.5,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: Brand.ink
    },

    detail: {
        fontSize: 11.5,
        fontWeight: 800,
        color: 'rgba(15, 13, 18, 0.75)'
    }
}))
