import AppText from "@/components/text/AppText";
import { ROUTES } from "@/constants/routes";
import { Brand } from "@/constants/theme";
import { useNow } from "@/hooks/useNow";
import { useT, useUiLanguage } from "@/features/i18n/LanguageContext";
import { useWordOfTheDay } from "@/features/league-of-letters/useWordOfTheDay";
import { resetDay, untilReset } from "@/features/league-of-letters/word-of-the-day";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

// The two tones the card's contents wear on lemon, in either scheme.
const ON_LEMON = {
    text: Brand.ink,
    muted: 'rgba(15, 13, 18, 0.62)'
};

// The tile is paper in both schemes, so the month above the date cannot be read from the palette.
const ON_TILE_MUTED = 'rgba(15, 13, 18, 0.5)';

const TILE_SIZE = 44;
const CHEVRON_SIZE = 34;

// How often the clock is re-read, which is fine at half a minute for a countdown drawn to the minute.
const TICK_MS = 30_000;

// The daily word, above the modes: the one thing on the page that expires.
export default function WordOfTheDayCard() {
    const styles = useStyles();
    const t = useT();
    const language = useUiLanguage();
    const router = useRouter();

    const now = useNow(TICK_MS);

    const { today, game, starting, start } = useWordOfTheDay();

    // A day still to play goes straight to the board; a day that is over goes to the month behind it.
    const open = today !== null && (today.playable || game?.status !== 'completed');

    const press = async () => {
        if (!open) {
            router.push(ROUTES.leagueOfLettersWordOfTheDay);
            return;
        }

        // The day has to be opened before there is a board to walk into, and the overview is where a refusal is explained.
        if (today.playable && !(await start())) {
            router.push(ROUTES.leagueOfLettersWordOfTheDay);
            return;
        }

        router.push(ROUTES.leagueOfLettersWordOfTheDayPlay);
    };

    return (
        <Pressable
            onPress={press}
            disabled={starting}
            accessibilityRole='button'
            accessibilityLabel={t('lol.index.wordOfTheDay.title')}
            style={[styles.card, starting && styles.starting]}
        >
            <View style={styles.date}>
                <AppText style={styles.month}>{monthLabel(now, language)}</AppText>

                <AppText style={styles.day}>{dayLabel(now)}</AppText>
            </View>

            <View style={styles.body}>
                <AppText style={styles.title}>{t('lol.index.wordOfTheDay.title')}</AppText>

                <AppText style={styles.subtitle}>
                    {t('lol.index.wordOfTheDay.resetIn', { time: untilReset(now) })}
                </AppText>
            </View>

            <View style={styles.chevron}>
                <Feather name="chevron-right" size={15} color={Brand.textOnAccent} />
            </View>
        </Pressable>
    )
}

// The date on the tile is the day the word belongs to, which is not the device's own date just before midnight.
function monthLabel(now: Date, language: string): string {
    return resetDay(now)
        .toLocaleDateString(language, { timeZone: 'UTC', month: 'short' })
        .replace('.', '')
        .toUpperCase();
}

function dayLabel(now: Date): string {
    return String(resetDay(now).getUTCDate()).padStart(2, '0');
}

const useStyles = createThemedStyles(theme => ({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 13,
        borderRadius: 22,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.lemon,
        ...theme.popShadow(theme.colors.shadow)
    },

    starting: {
        opacity: 0.6
    },

    date: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        flexShrink: 0,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        // Ink and paper in both schemes, the way every tile punched into an accent is.
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent
    },

    month: {
        fontSize: 8,
        fontWeight: 900,
        letterSpacing: 0.4,
        color: ON_TILE_MUTED
    },

    day: {
        fontSize: 16,
        lineHeight: 16,
        fontWeight: 900,
        color: Brand.ink
    },

    body: {
        flex: 1,
        minWidth: 0
    },

    title: {
        fontSize: 16,
        fontWeight: 900,
        letterSpacing: -0.4,
        color: ON_LEMON.text
    },

    subtitle: {
        marginTop: 2,
        fontSize: 11,
        fontWeight: 800,
        color: ON_LEMON.muted
    },

    chevron: {
        width: CHEVRON_SIZE,
        height: CHEVRON_SIZE,
        flexShrink: 0,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: Brand.ink
    }
}))
