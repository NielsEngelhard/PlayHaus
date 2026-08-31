import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { ChoiceOption } from "@/features/pubquizr/hot-seat";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";
import Feather from "@expo/vector-icons/Feather";

interface Props {
    options: ChoiceOption[]
    /** Whether the quizmaster has uncovered the answer yet. */
    revealed: boolean
}

/**
 * Round 2's four options, set as four options to read out.
 *
 * Stacked rather than in a row. Four answer texts will not fit across a phone — "3 hours
 * 47 minutes" is not a chip — and reading them out in a column matches the order they
 * come off the page, which is what the person holding it is doing.
 *
 * Nothing here is tappable. Nobody picks an option on this phone: the table shouts a
 * letter and the quizmaster rules on it with the same two buttons every other round uses.
 * Which is why the letters are set as hard as they are — the letter is the thing being
 * said out loud, and it has to be findable at a glance while somebody is arguing.
 *
 * The reveal marks the right row and does nothing else. The three that are over used to
 * fall back to 38-point ghosts, which was buying height for an answer panel underneath —
 * and the panel has gone, because the answer to a multiple choice question is one of these
 * four rows and did not need saying twice. Without something to buy the height for, the
 * shrinking was the whole list rearranging itself under a table that had just been read
 * it. So all four stay where they are and mint says which one it was.
 */
export default function ChoiceCard({ options, revealed }: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <View
            style={styles.card}
            accessibilityRole="list"
            accessibilityLabel={t('pubquizr.play.choice.options')}
        >
            {options.map(option => {
                const right = revealed && option.correct;

                return (
                    <View
                        key={option.id}
                        style={[styles.option, right && styles.right]}
                        accessibilityRole="text"
                        accessibilityLabel={right
                            ? t('pubquizr.play.choice.spokenCorrect', {
                                letter: option.letter,
                                text: option.text
                            })
                            : t('pubquizr.play.choice.spoken', {
                                letter: option.letter,
                                text: option.text
                            })}
                    >
                        <View style={[styles.letter, right && styles.letterRight]}>
                            <AppText style={[styles.letterText, right && styles.onMint]}>
                                {option.letter}
                            </AppText>
                        </View>

                        <AppText
                            style={[styles.text, right && styles.textRight, right && styles.onMint]}
                        >
                            {option.text}
                        </AppText>

                        {/* Only ever on the right one, so the row does not reserve space
                            for a tick that is never coming. */}
                        {right && (
                            <Feather name="check" size={18} color={Brand.ink} />
                        )}
                    </View>
                )
            })}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // No padding and no fill of its own: this sits inside `ScriptCard`, under the same
    // rule as the question, because the question and its four options are one thing to
    // say and should not be two blocks competing for the same height.
    card: {
        flexShrink: 0,
        gap: 8
    },

    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        minHeight: 46,
        paddingVertical: 7,
        paddingHorizontal: 10,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        // The canvas rather than the card's own fill: these sit *on* a card, and a white
        // row on a white card is an outline with nothing inside it.
        backgroundColor: theme.colors.background
    },

    // Mint in both schemes, the same "yes, this one" the Correct button wears, so the
    // two agree about what a right answer looks like.
    right: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint,
        ...theme.shadows.hardSmall
    },

    letter: {
        width: 28,
        height: 28,
        flexShrink: 0,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundElement
    },

    letterRight: {
        borderColor: Brand.ink,
        backgroundColor: 'rgba(15, 13, 18, 0.08)'
    },

    letterText: {
        fontSize: 13,
        fontWeight: 900,
        color: theme.colors.text
    },

    // `minWidth: 0` so a long option wraps inside the row instead of pushing the tick
    // off the end of it.
    text: {
        flex: 1,
        minWidth: 0,
        fontSize: 15,
        fontWeight: 700,
        lineHeight: 15 * 1.3,
        color: theme.colors.text
    },

    textRight: {
        fontSize: 15.5,
        fontWeight: 900
    },

    // Ink on mint in both schemes, because the fill is mint in both.
    onMint: {
        color: Brand.ink
    }
}))
