import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useT } from "@/features/i18n/LanguageContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

/** How the round on screen ended, or that it has not. */
export type RoundOutcome = 'playing' | 'won' | 'lost';

interface Props {
    outcome: RoundOutcome,
    /** The letter every row opens with. Shown while the round is still winnable. */
    firstLetter: string,
    /** How many rows the player has spent. Shown once the round is decided. */
    tries: number,
    /** How many rows the player got. The ratio's denominator, shown alongside `tries`. */
    maxGuesses: number
}

/**
 * One chip that changes meaning as the round does: the letter you are given while it can
 * still be won, and how it went once it cannot.
 *
 * All that is left of the bar this used to be. The way out, the round label and the
 * progress track were the other three quarters of a cream card sitting under the app
 * header; they are the accent band now — see `InGameHeader`, which draws this in its
 * right-hand slot. What kept them together was the round, and the band is where the round
 * is spoken for, so this is free to be the one thing the bar had that no other game does.
 *
 * Sized to sit beside a clock rather than alone in a header any more — see `PlayingGame`,
 * which now draws this next to `GameTimer` on a shared board and next to the elapsed clock
 * on a solo one. A touch smaller than the header chip this replaced, since it now always
 * has company on its row instead of the whole width to itself.
 */
export default function RoundChip({ outcome, firstLetter, tries, maxGuesses }: Props) {
    const styles = useStyles();
    const t = useT();

    if (outcome !== 'playing') {
        return (
            <View style={[styles.chip, outcome === 'won' ? styles.chipWon : styles.chipLost]}>
                <Feather
                    name={outcome === 'won' ? 'check' : 'x'}
                    size={13}
                    color={Brand.ink}
                />

                <AppText style={styles.tries}>
                    {t('lol.game.guesses', { guesses: tries, max: maxGuesses })}
                </AppText>
            </View>
        )
    }

    if (firstLetter === '') return null;

    return (
        <View
            style={[styles.chip, styles.chipHint]}
            accessibilityRole='text'
            accessibilityLabel={t('lol.game.hintLabel', { letter: firstLetter })}
        >
            <AppText style={styles.hintLabel}>{t('lol.game.hint')}</AppText>

            <AppText style={styles.hintLetter}>{firstLetter}</AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => {
    const dark = theme.scheme === 'dark';

    return {
        chip: {
            flexShrink: 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderRadius: 11,
            borderWidth: theme.borderWidth
        },
        chipHint: {
            borderColor: dark ? theme.colors.lemon : theme.colors.border,
            backgroundColor: theme.colors.lemon
        },
        chipWon: {
            borderColor: dark ? theme.colors.mint : theme.colors.border,
            backgroundColor: theme.colors.mint
        },
        chipLost: {
            borderColor: dark ? theme.colors.blush : theme.colors.border,
            backgroundColor: theme.colors.blush
        },
        hintLabel: {
            fontSize: 9,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 1,
            // Ink at 60%, on a lemon chip in both schemes — so it is stated once here
            // rather than flipping with the scheme like the rest of the palette.
            color: 'rgba(15, 13, 18, 0.6)'
        },
        hintLetter: {
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: -0.5,
            color: Brand.ink
        },
        tries: {
            fontSize: 11,
            fontWeight: 900,
            color: Brand.ink
        }
    };
})
