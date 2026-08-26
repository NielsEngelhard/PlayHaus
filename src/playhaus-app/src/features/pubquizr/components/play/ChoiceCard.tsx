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
 * The two densities are the round's two beats. While the question is being read, all four
 * are equals at full size, because at that moment they are four things to say. Once a
 * letter has been shouted and the answer is up, three of them are over: they fall back to
 * 38-point ghosts and the right one keeps its full row. That is not decoration either —
 * it hands about 90 points to the answer panel underneath, and it means a quizmaster who
 * has just read four options aloud does not have to match a sentence back to a row.
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
                // Only the ones that are over. The right one keeps its full row even
                // after the reveal, so the row the quizmaster is looking for is the one
                // that has not moved.
                const spent = revealed && !option.correct;

                return (
                    <View
                        key={option.id}
                        style={[styles.option, right && styles.right, spent && styles.spent]}
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
                        <View
                            style={[
                                styles.letter,
                                right && styles.letterRight,
                                spent && styles.letterSpent
                            ]}
                        >
                            <AppText
                                style={[
                                    styles.letterText,
                                    right && styles.onMint,
                                    spent && styles.letterTextSpent
                                ]}
                            >
                                {option.letter}
                            </AppText>
                        </View>

                        <AppText
                            style={[
                                styles.text,
                                right && styles.textRight,
                                right && styles.onMint,
                                spent && styles.textSpent
                            ]}
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
        ...(theme.scheme === 'dark' ? {} : theme.shadows.hardSmall)
    },

    // Answered and over. Height as well as opacity: fading four full rows would still
    // leave four full rows' worth of the screen spoken for.
    spent: {
        minHeight: 38,
        height: 38,
        paddingVertical: 0,
        borderRadius: 12,
        borderColor: theme.colors.boardEmptyBorder,
        backgroundColor: 'transparent',
        opacity: 0.45
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

    letterSpent: {
        width: 24,
        height: 24,
        borderRadius: 8,
        borderColor: theme.colors.borderSubtle,
        backgroundColor: 'transparent'
    },

    letterText: {
        fontSize: 13,
        fontWeight: 900,
        color: theme.colors.text
    },

    letterTextSpent: {
        fontSize: 11.5
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

    textSpent: {
        fontSize: 13.5,
        lineHeight: 13.5 * 1.3
    },

    // Ink on mint in both schemes, because the fill is mint in both.
    onMint: {
        color: Brand.ink
    }
}))
