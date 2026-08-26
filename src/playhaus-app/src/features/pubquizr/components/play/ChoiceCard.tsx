import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { ChoiceOption } from "@/features/pubquizr/hot-seat";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

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
 * The right one is marked once the answer is uncovered, and not a moment before. The
 * covered panel underneath says it in words; this says it in place, so a quizmaster who
 * has just read four options aloud does not have to match a sentence back to a row.
 */
export default function ChoiceCard({ options, revealed }: Props) {
    const t = useT();
    const theme = useTheme();
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

                        <AppText style={[styles.text, right && styles.onMint]}>
                            {option.text}
                        </AppText>

                        {/* Only ever on the right one, so the row does not reserve space
                            for a tick that is never coming. */}
                        {right && (
                            <Feather name="check" size={16} color={Brand.ink} />
                        )}
                    </View>
                )
            })}

            {!revealed && (
                <AppText style={[styles.hint, { color: theme.colors.textMuted }]}>
                    {t('pubquizr.play.choice.readThemOut')}
                </AppText>
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        flexShrink: 0,
        gap: 7
    },

    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 9,
        paddingHorizontal: 10,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundSecondary
    },

    // Mint in both schemes, the same "yes, this one" the Correct button wears, so the
    // two agree about what a right answer looks like.
    right: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint
    },

    letter: {
        width: 26,
        height: 26,
        flexShrink: 0,
        borderRadius: 8,
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
        fontSize: 12,
        fontWeight: 900,
        color: theme.colors.text
    },

    // `minWidth: 0` so a long option wraps inside the row instead of pushing the tick
    // off the end of it.
    text: {
        flex: 1,
        minWidth: 0,
        fontSize: 14,
        fontWeight: 700,
        lineHeight: 14 * 1.35,
        color: theme.colors.text
    },

    // Ink on mint in both schemes, because the fill is mint in both.
    onMint: {
        color: Brand.ink
    },

    hint: {
        marginTop: 1,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 600
    }
}))
