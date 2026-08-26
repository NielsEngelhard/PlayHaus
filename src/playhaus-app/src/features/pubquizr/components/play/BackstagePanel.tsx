import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";

interface Props {
    answer: string
    /**
     * The letter it came in on, in round 2. Set beside the answer rather than only in
     * the row above, because the letter is what the table shouted and the words are what
     * the quizmaster is checking against — reading "B  Amsterdam" answers both at once.
     */
    letter?: string
    /** Wordings that also count. "Tarantino" for "Quentin Tarantino". */
    aliases: string[]
    /** Whether the quizmaster has asked to see it. */
    revealed: boolean
    onReveal: () => void
    /**
     * How to cover it again, where that is offered. Round 3 is the one place it is: its
     * form stays on screen for as long as it takes four people to say a number, and an
     * answer sitting open above it for that whole time will be read by somebody.
     */
    onHide?: () => void
    /**
     * The short version: one row, no room given to the answer, for a screen where the
     * slab is a reference rather than the subject.
     */
    compact?: boolean
    /** For layout only — how the panel sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
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
export default function BackstagePanel({
    answer,
    letter,
    aliases,
    revealed,
    onReveal,
    onHide,
    compact = false,
    style
}: Props) {
    const t = useT();
    const styles = useStyles();

    if (!revealed) {
        return (
            <PopPressable
                onPress={onReveal}
                accessibilityRole="button"
                accessibilityLabel={t('pubquizr.play.answer.reveal')}
                style={[styles.panel, compact && styles.compactPanel, style]}
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
        <View style={[styles.panel, compact && styles.compactPanel, style]}>
            <View style={styles.open}>
                <View style={styles.said}>
                    <View style={styles.warning}>
                        <Feather name="eye-off" size={14} color={Brand.lemon} />

                        <AppText style={styles.warningText}>
                            {compact
                                ? t('pubquizr.play.closest.answerLabel')
                                : t('pubquizr.play.onlyYouSeeThis')}
                        </AppText>
                    </View>

                    <View style={styles.answerRow}>
                        {letter !== undefined && (
                            <AppText style={styles.letter}>{letter}</AppText>
                        )}

                        <AppText
                            style={[styles.answer, compact && styles.compactAnswer]}
                        >
                            {answer}
                        </AppText>
                    </View>

                    {aliases.length > 0 && !compact && (
                        <AppText style={styles.aliases}>
                            {t('pubquizr.play.alsoAccept', { answers: aliases.join(', ') })}
                        </AppText>
                    )}
                </View>

                {onHide !== undefined && (
                    <Pressable
                        onPress={onHide}
                        accessibilityRole="button"
                        accessibilityLabel={t('pubquizr.play.closest.hide')}
                        // Hit slop rather than a taller pill: the control has to clear 44
                        // points to be hittable and the bar it sits in is 46 tall, so the
                        // room has to come from around it rather than from inside it.
                        hitSlop={10}
                        style={styles.hide}
                    >
                        <Feather name="eye-off" size={13} color="rgba(254, 251, 248, 0.7)" />

                        <AppText style={styles.hideLabel}>
                            {t('pubquizr.play.closest.hide')}
                        </AppText>
                    </Pressable>
                )}
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    panel: {
        flexShrink: 0,
        justifyContent: 'center',
        padding: 15,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        // Ink on ink in the dark scheme would be an invisible edge, so the border
        // steps up to the scheme's own rather than staying the slab's colour.
        borderColor: theme.scheme === 'dark' ? theme.colors.border : Brand.ink,
        backgroundColor: Brand.ink
    },

    compactPanel: {
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 16
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

    open: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },

    said: {
        flex: 1,
        minWidth: 0
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

    answerRow: {
        marginTop: 6,
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 10
    },

    // Lemon, and a good deal smaller than the words beside it. It is the index rather
    // than the answer: the thing you find the row by, not the thing you read out.
    letter: {
        flexShrink: 0,
        fontSize: 15,
        fontWeight: 900,
        color: Brand.lemon
    },

    // Paper in both schemes: the slab under it is ink in both.
    answer: {
        flex: 1,
        minWidth: 0,
        fontSize: 26,
        fontWeight: 900,
        letterSpacing: -0.7,
        color: Brand.textOnAccent
    },

    compactAnswer: {
        fontSize: 24,
        letterSpacing: -0.6
    },

    aliases: {
        marginTop: 6,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 12 * 1.4,
        // Quieter than the answer without being a second colour: the same paper,
        // stepped back, so the two read as one thing said twice.
        color: 'rgba(254, 251, 248, 0.6)'
    },

    hide: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: 'rgba(254, 251, 248, 0.3)'
    },

    hideLabel: {
        fontSize: 11,
        fontWeight: 800,
        color: 'rgba(254, 251, 248, 0.7)'
    }
}))
