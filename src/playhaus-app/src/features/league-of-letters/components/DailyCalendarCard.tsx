import type { DailyDay } from '@/api/calls/league-of-letters';
import AppText from '@/components/text/AppText';
import { Brand } from '@/constants/theme';
import { useT, useUiLanguage } from '@/features/i18n/LanguageContext';
import { dayTone, monthWeeks, QUICK_GUESSES, WEEKDAY_COLUMNS, weekdayInitial, type DayTone } from '@/features/league-of-letters/word-of-the-day';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { View } from 'react-native';

interface Props {
    /** Every day of the month, oldest first. */
    month: DailyDay[],
    /** The server's today, which is the one box that is neither past nor future. */
    today: string,
    maxGuesses: number
}

// The month, a box a day: how each one went, and how much of it is still to come.
export default function DailyCalendarCard({ month, today, maxGuesses }: Props) {
    const styles = useStyles();
    const t = useT();
    const language = useUiLanguage();

    const weeks = monthWeeks(month);

    return (
        <View style={styles.card}>
            <View style={styles.week}>
                {WEEKDAY_COLUMNS.map(weekday => (
                    <AppText key={weekday} style={styles.column}>
                        {weekdayInitial(weekday, language)}
                    </AppText>
                ))}
            </View>

            {weeks.map(week => (
                <View key={week.find(day => day !== null)?.day ?? ''} style={styles.week}>
                    {week.map((day, index) => (
                        <Box key={day?.day ?? index} day={day} today={today} />
                    ))}
                </View>
            ))}

            <AppText style={styles.legendTitle}>{t('lol.wordOfTheDay.guesses')}</AppText>

            <View style={styles.legend}>
                <Swatch tone='quick' label={`1–${QUICK_GUESSES}`} />

                <Swatch tone='slow' label={`${QUICK_GUESSES + 1}–${maxGuesses}`} />

                <Swatch tone='missed' label={t('lol.wordOfTheDay.legendMissed')} />
            </View>
        </View>
    )
}

function Box({ day, today }: { day: DailyDay | null, today: string }) {
    const styles = useStyles();

    // A blank that only pushes the row along, so it carries neither a number nor an outline.
    if (day === null) return <View style={styles.box} />;

    const tone = dayTone(day, today);

    return (
        <View style={[styles.box, styles.day, styles[TONE_STYLES[tone]], day.day === today && styles.boxToday]}>
            <AppText style={[styles.number, FILLED.has(tone) ? styles.numberFilled : styles.numberEmpty]}>
                {Number(day.day.slice(-2))}
            </AppText>
        </View>
    )
}

function Swatch({ tone, label }: { tone: DayTone, label: string }) {
    const styles = useStyles();

    return (
        <View style={styles.swatch}>
            <View style={[styles.chip, styles[TONE_STYLES[tone]]]} />

            <AppText style={styles.swatchLabel}>{label}</AppText>
        </View>
    )
}

// Which fill a box wears, keyed by what its day did.
const TONE_STYLES: Record<DayTone, 'toneQuick' | 'toneSlow' | 'toneMissed' | 'toneOpen' | 'toneSkipped' | 'toneFuture'> = {
    quick: 'toneQuick',
    slow: 'toneSlow',
    missed: 'toneMissed',
    open: 'toneOpen',
    skipped: 'toneSkipped',
    future: 'toneFuture'
};

// The tones that are a fill rather than an outline, and so are read against ink.
const FILLED = new Set<DayTone>(['quick', 'slow', 'missed']);

const useStyles = createThemedStyles(theme => ({
    card: {
        gap: 9,
        padding: 13,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.popShadow(theme.colors.shadow)
    },

    week: {
        flexDirection: 'row',
        gap: 5
    },

    column: {
        flex: 1,
        textAlign: 'center',
        fontSize: 10,
        fontWeight: 900,
        color: theme.colors.textSecondary
    },

    box: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 7
    },

    day: {
        alignItems: 'center',
        justifyContent: 'center'
    },

    // Today is the one box that is raised off the card, played or not.
    boxToday: {
        borderColor: theme.colors.borderStrong,
        ...theme.shadows.hardSmall
    },

    toneQuick: {
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: Brand.mint
    },

    toneSlow: {
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: Brand.lemon
    },

    toneMissed: {
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: Brand.blush
    },

    // Today, still open: an outline waiting to be filled.
    toneOpen: {
        borderWidth: theme.borderWidth,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderStrong
    },

    toneSkipped: {
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted
    },

    // A day nobody could have played yet: a number and nothing around it.
    toneFuture: {},

    number: {
        fontSize: 10.5,
        fontWeight: 900
    },

    // Mint, lemon and blush are pale in both schemes, so what is written on them is ink in both.
    numberFilled: {
        color: Brand.ink
    },

    numberEmpty: {
        color: theme.colors.textSecondary
    },

    legendTitle: {
        paddingTop: 2,
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: theme.colors.textSecondary
    },

    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },

    swatch: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },

    chip: {
        width: 11,
        height: 11,
        borderRadius: 4
    },

    swatchLabel: {
        fontSize: 10.5,
        fontWeight: 800,
        color: theme.colors.textSecondary
    }
}))
