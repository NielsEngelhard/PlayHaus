import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    answer: string
    /** Wordings that also count. "Tarantino" for "Quentin Tarantino". */
    aliases: string[]
    /** Whether the quizmaster has asked to see it. */
    revealed: boolean
    onReveal: () => void
}

/**
 * The back of the card: what the answer actually is, once you have asked for it.
 *
 * Covered until tapped, and that is not ceremony. The phone goes round a table with
 * five other people leaning towards it, and this screen is the one thing in the game
 * that can spoil the question — an answer that is simply *there* the moment the board
 * appears is an answer somebody else reads over your shoulder. Uncovering it is a
 * deliberate act, done when the reader is ready and holding the phone at their own
 * angle.
 *
 * Ink in both schemes, covered or not. Every other surface in this app is paper or
 * near-black depending on the scheme; this one is always the dark slab, so "the part
 * nobody else may see" is a thing you recognise by its colour before you have read a
 * word of it.
 *
 * The aliases matter more than they look. A quizmaster who cannot see that "the Meuse"
 * also counts will wave off a right answer, and the table will argue about it.
 */
export default function BackstagePanel({ answer, aliases, revealed, onReveal }: Props) {
    const t = useT();
    const styles = useStyles();

    if (!revealed) {
        return (
            <PopPressable
                onPress={onReveal}
                accessibilityRole="button"
                accessibilityLabel={t('pubquizr.play.answer.reveal')}
                style={styles.panel}
            >
                <View style={styles.covered}>
                    <View style={styles.eye}>
                        <Feather name="eye" size={16} color={Brand.ink} />
                    </View>

                    <View style={styles.coveredText}>
                        <AppText style={styles.revealLabel}>
                            {t('pubquizr.play.answer.reveal')}
                        </AppText>

                        <AppText style={styles.revealHint}>
                            {t('pubquizr.play.answer.revealHint')}
                        </AppText>
                    </View>
                </View>
            </PopPressable>
        )
    }

    return (
        <View style={styles.panel}>
            <View style={styles.warning}>
                <Feather name="eye-off" size={14} color={Brand.lemon} />

                <AppText style={styles.warningText}>
                    {t('pubquizr.play.onlyYouSeeThis')}
                </AppText>
            </View>

            <AppText style={styles.answer}>{answer}</AppText>

            {aliases.length > 0 && (
                <AppText style={styles.aliases}>
                    {t('pubquizr.play.alsoAccept', { answers: aliases.join(', ') })}
                </AppText>
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    panel: {
        flexShrink: 0,
        padding: 15,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        // Ink on ink in the dark scheme would be an invisible edge, so the border
        // steps up to the scheme's own rather than staying the slab's colour.
        borderColor: theme.scheme === 'dark' ? theme.colors.border : Brand.ink,
        backgroundColor: Brand.ink
    },

    covered: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },

    // Lemon on the ink slab: the one warm thing on the covered panel, so the tap
    // target reads as an invitation rather than as a disabled block.
    eye: {
        width: 34,
        height: 34,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Brand.lemon
    },

    coveredText: {
        flex: 1,
        minWidth: 0
    },

    revealLabel: {
        fontSize: 15,
        fontWeight: 900,
        letterSpacing: -0.2,
        color: Brand.textOnAccent
    },

    revealHint: {
        marginTop: 2,
        fontSize: 11.5,
        fontWeight: 600,
        color: 'rgba(254, 251, 248, 0.6)'
    },

    warning: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7
    },

    warningText: {
        fontSize: 10.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: Brand.lemon
    },

    // Paper in both schemes: the slab under it is ink in both.
    answer: {
        marginTop: 9,
        fontSize: 26,
        fontWeight: 900,
        letterSpacing: -0.7,
        color: Brand.textOnAccent
    },

    aliases: {
        marginTop: 6,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 12 * 1.4,
        // Quieter than the answer without being a second colour: the same paper,
        // stepped back, so the two read as one thing said twice.
        color: 'rgba(254, 251, 248, 0.6)'
    }
}))
