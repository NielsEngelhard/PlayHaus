import type { DailyStats } from '@/api/calls/league-of-letters';
import AppText from '@/components/text/AppText';
import { Brand } from '@/constants/theme';
import { useT, useUiLanguage } from '@/features/i18n/LanguageContext';
import { averageLabel } from '@/features/league-of-letters/word-of-the-day';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

interface Props {
    stats: DailyStats
}

const TILE_SIZE = 34;

// The number there is to improve on: the day that took the fewest guesses.
export default function DailyBestCard({ stats }: Props) {
    const styles = useStyles();
    const t = useT();
    const language = useUiLanguage();

    const best = stats.bestGuesses;

    return (
        <View style={styles.card}>
            <View style={styles.tile}>
                <Feather name='award' size={16} color={Brand.ink} />
            </View>

            <View style={styles.lines}>
                <AppText style={styles.headline}>
                    {best === 0
                        ? t('lol.wordOfTheDay.noBestDay')
                        : t(best === 1 ? 'lol.wordOfTheDay.bestDayOne' : 'lol.wordOfTheDay.bestDayMany', { guesses: best })}
                </AppText>

                {stats.daysPlayed > 0 && (
                    <AppText style={styles.detail}>
                        {t(stats.daysPlayed === 1 ? 'lol.wordOfTheDay.averageOne' : 'lol.wordOfTheDay.averageMany', {
                            average: averageLabel(stats.averageGuesses, language),
                            days: stats.daysPlayed
                        })}
                    </AppText>
                )}
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        padding: 12,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.popShadow(theme.colors.shadow)
    },

    // Blush and ink in both schemes, the way every tile punched into a card is.
    tile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 11,
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: Brand.blush
    },

    lines: {
        flex: 1,
        minWidth: 0,
        gap: 2
    },

    headline: {
        fontSize: 13.5,
        fontWeight: 900,
        letterSpacing: -0.2,
        color: theme.colors.text
    },

    detail: {
        fontSize: 10.5,
        fontWeight: 700,
        color: theme.colors.textSecondary
    }
}))
