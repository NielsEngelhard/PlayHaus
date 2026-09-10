import type { DailyDay } from '@/api/calls/league-of-letters';
import AppText from '@/components/text/AppText';
import { useT, useUiLanguage } from '@/features/i18n/LanguageContext';
import { weekdayLabel } from '@/features/league-of-letters/word-of-the-day';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { View } from 'react-native';

interface Props {
    streak: number,
    /** The last seven days, oldest first, ending today. */
    history: DailyDay[]
}

const TILE_HEIGHT = 30;

// The run of days, as a number and as the week behind it.
export default function StreakCard({ streak, history }: Props) {
    const styles = useStyles();
    const t = useT();
    const language = useUiLanguage();

    const today = history.length === 0 ? undefined : history[history.length - 1].day;

    return (
        <View style={styles.card}>
            <View style={styles.head}>
                <AppText style={styles.eyebrow}>{t('lol.wordOfTheDay.streak')}</AppText>

                <AppText style={styles.count}>{streak}</AppText>

                <AppText style={styles.days}>
                    {streak === 1 ? t('lol.wordOfTheDay.daysOne') : t('lol.wordOfTheDay.daysMany')}
                </AppText>
            </View>

            <View style={styles.week}>
                {history.map(day => (
                    <View key={day.day} style={styles.column}>
                        <View style={[
                            styles.tile,
                            day.played && styles.tilePlayed,
                            // Today is the only open box, and it says so by being dashed.
                            !day.played && day.day === today && styles.tileToday
                        ]} />

                        <AppText style={[styles.label, day.day === today && styles.labelToday]}>
                            {weekdayLabel(day.weekday, language)}
                        </AppText>
                    </View>
                ))}
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        gap: 10,
        padding: 13,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.popShadow(theme.colors.shadow)
    },

    head: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 5
    },

    eyebrow: {
        flex: 1,
        minWidth: 0,
        fontSize: 9.5,
        fontWeight: 900,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: theme.colors.textSecondary
    },

    count: {
        fontSize: 17,
        fontWeight: 900,
        color: theme.colors.text
    },

    days: {
        fontSize: 10.5,
        fontWeight: 800,
        color: theme.colors.textSecondary
    },

    week: {
        flexDirection: 'row',
        gap: 5
    },

    column: {
        flex: 1,
        gap: 4
    },

    // A day nobody played: an outline and nothing in it.
    tile: {
        height: TILE_HEIGHT,
        borderRadius: 9,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted
    },

    tilePlayed: {
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.lemon
    },

    tileToday: {
        borderStyle: 'dashed',
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : 'rgba(15, 13, 18, 0.4)'
    },

    label: {
        textAlign: 'center',
        fontSize: 10,
        fontWeight: 900,
        color: theme.colors.textSecondary
    },

    labelToday: {
        color: theme.colors.text
    }
}))
