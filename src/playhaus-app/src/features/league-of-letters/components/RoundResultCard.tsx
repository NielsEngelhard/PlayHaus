import AppText from "@/components/text/AppText";
import { Brand, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useT } from "@/features/i18n/LanguageContext";
import { View } from "react-native";

interface Props {
    /** The answer, now that the round is over and the server has handed it over. */
    word: string,
    /** How many rows the player spent, and how many they had. */
    tries: number,
    maxGuesses: number,
    won: boolean
}

/**
 * The verdict, in the space the keyboard was in.
 *
 * It takes the keyboard's place rather than sitting above it: there is nothing left to
 * type, and a dead keyboard under a result is a control that looks broken. The word is
 * spelled out even on a win — the board says it in green, but it says it as five separate
 * tiles, and the point of a result is to be read as a word.
 */
export default function RoundResultCard({ word, tries, maxGuesses, won }: Props) {
    const styles = useStyles();
    const t = useT();

    return (
        <View style={styles.card}>
            {/* Tilted and hung over the card's own edge, the way the FAVOURITE flag sits
                on a game card — a sticker on the result rather than a heading in it. */}
            <View style={[styles.badge, won ? styles.badgeWon : styles.badgeLost]}>
                <AppText style={styles.badgeText}>{won ? t('lol.game.solved') : t('lol.game.lost')}</AppText>
            </View>

            <View style={styles.row}>
                <View>
                    <AppText style={styles.label}>{t('lol.game.theWord')}</AppText>

                    <AppText style={styles.word}>{word.toUpperCase()}</AppText>
                </View>

                <View style={styles.tries}>
                    <AppText style={styles.label}>{t('lol.game.attempts')}</AppText>

                    <AppText style={styles.count}>
                        {won ? tries : '—'}
                        <AppText style={styles.outOf}>/{maxGuesses}</AppText>
                    </AppText>
                </View>
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => {
    const dark = theme.scheme === 'dark';

    return {
        card: {
            position: 'relative',
            padding: Spacing.three,
            borderRadius: 22,
            borderWidth: theme.borderWidth,
            borderColor: theme.colors.borderStrong,
            backgroundColor: theme.colors.backgroundSecondary,
            ...theme.popShadow(theme.colors.shadow)
        },
        badge: {
            position: 'absolute',
            top: -11,
            left: Spacing.three,
            paddingVertical: 3,
            paddingHorizontal: 9,
            borderRadius: 8,
            borderWidth: theme.borderWidth,
            transform: [{ rotate: '-6deg' }],
            ...theme.shadows.hardSmall
        },
        badgeWon: {
            borderColor: dark ? theme.colors.mint : theme.colors.border,
            backgroundColor: theme.colors.mint
        },
        badgeLost: {
            borderColor: dark ? theme.colors.blush : theme.colors.border,
            backgroundColor: theme.colors.blush
        },
        badgeText: {
            fontSize: 10.5,
            fontWeight: 900,
            letterSpacing: 0.8,
            color: Brand.ink
        },
        row: {
            // Baselines rather than centres: the two big numbers should sit on the same
            // line even though their labels are different lengths.
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            // Clears the badge hanging over the top edge.
            marginTop: Spacing.one
        },
        label: {
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 1.6,
            color: theme.colors.textMuted
        },
        word: {
            marginTop: 2,
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: -1,
            color: theme.colors.text
        },
        tries: {
            alignItems: 'flex-end'
        },
        count: {
            marginTop: 2,
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: -1,
            color: theme.colors.text
        },
        outOf: {
            fontSize: 16,
            fontWeight: 900,
            color: theme.colors.textMuted
        }
    };
})
