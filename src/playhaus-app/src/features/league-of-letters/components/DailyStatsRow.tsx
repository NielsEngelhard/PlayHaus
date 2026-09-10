import type { DailyStats } from '@/api/calls/league-of-letters';
import AppText from '@/components/text/AppText';
import { useT, useUiLanguage } from '@/features/i18n/LanguageContext';
import { averageLabel } from '@/features/league-of-letters/word-of-the-day';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { View } from 'react-native';

interface Props {
    stats: DailyStats
}

// The dash a number nobody has earned yet is written with.
const EMPTY = '–';

// The three numbers under the calendar: the day to beat, the run of them, and how many there have been.
export default function DailyStatsRow({ stats }: Props) {
    const styles = useStyles();
    const t = useT();
    const language = useUiLanguage();

    return (
        <View style={styles.row}>
            <Stat
                value={stats.bestGuesses === 0 ? EMPTY : String(stats.bestGuesses)}
                label={t('lol.wordOfTheDay.statBest')}
            />

            <Stat
                value={stats.daysSolved === 0 ? EMPTY : averageLabel(stats.averageGuesses, language)}
                label={t('lol.wordOfTheDay.statAverage')}
            />

            <Stat value={String(stats.daysPlayed)} label={t('lol.wordOfTheDay.statDays')} />
        </View>
    )
}

function Stat({ value, label }: { value: string, label: string }) {
    const styles = useStyles();

    return (
        <View style={styles.tile}>
            <AppText style={styles.value}>{value}</AppText>

            <AppText style={styles.label}>{label}</AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    row: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 9
    },

    tile: {
        flex: 1,
        minWidth: 0,
        padding: 11,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    value: {
        fontSize: 17,
        fontWeight: 900,
        color: theme.colors.text
    },

    label: {
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: theme.colors.textSecondary
    }
}))
