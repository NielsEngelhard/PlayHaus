import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { Brand } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";

interface Props {
    /** The thing only the person holding the phone may see. */
    secret: string
    /** What the covered card offers, e.g. "Tap to see your word". */
    revealLabel: string
    /** The small print under it — usually a reminder to shield the screen. */
    revealHint: string
    /** The uppercase warning above the secret once it is open. */
    warning: string
    revealed: boolean
    onReveal: () => void
    /** Offered where the card stays on screen long enough to be read over a shoulder. */
    onHide?: () => void
    hideLabel?: string
    style?: StyleProp<ViewStyle>
}

/**
 * The back of the card: something one person may read, once they have asked to.
 *
 * Covered until tapped, and that is not ceremony. The phone goes round a table with
 * other people leaning towards it, and this is the one thing on screen that can spoil
 * the game — a secret that is simply *there* the moment the screen appears is a secret
 * somebody else reads over your shoulder. Uncovering it is a deliberate act, done when
 * the reader is holding the phone at their own angle.
 *
 * Ink in both schemes, covered or not. Every other surface in this app is paper or
 * near-black depending on the scheme; this one is always the dark slab, so "the part
 * nobody else may see" is a thing you recognise by its colour before you have read a
 * word of it.
 *
 * A sibling of `features/pubquizr/components/play/BackstagePanel`, not a generalisation
 * of it: that one carries a round's letter and the wordings that also count, which are
 * facts about marking a quiz answer and have no meaning in a game where the secret is a
 * single word. They share a look because they are the same promise, not the same panel.
 */
export default function SecretCard({
    secret,
    revealLabel,
    revealHint,
    warning,
    revealed,
    onReveal,
    onHide,
    hideLabel,
    style
}: Props) {
    const styles = useStyles();

    if (!revealed) {
        return (
            <PopPressable
                onPress={onReveal}
                accessibilityRole="button"
                accessibilityLabel={revealLabel}
                style={[styles.panel, style]}
            >
                <View style={styles.covered}>
                    {/* Lemon on the ink slab: the one warm thing on the covered card,
                        so the tap target reads as an invitation rather than a block. */}
                    <View style={styles.eye}>
                        <Feather name="eye" size={16} color={Brand.ink} />
                    </View>

                    <View style={styles.coveredText}>
                        <AppText style={styles.revealLabel}>{revealLabel}</AppText>
                        <AppText style={styles.revealHint}>{revealHint}</AppText>
                    </View>
                </View>
            </PopPressable>
        )
    }

    return (
        <View style={[styles.panel, style]}>
            <View style={styles.open}>
                <View style={styles.said}>
                    <View style={styles.warning}>
                        <Feather name="eye-off" size={14} color={Brand.lemon} />

                        <AppText style={styles.warningText}>{warning}</AppText>
                    </View>

                    <AppText style={styles.secret}>{secret}</AppText>
                </View>

                {onHide !== undefined && hideLabel !== undefined && (
                    <Pressable
                        onPress={onHide}
                        accessibilityRole="button"
                        accessibilityLabel={hideLabel}
                        style={styles.hide}
                    >
                        <Feather name="eye-off" size={12} color="rgba(254, 251, 248, 0.7)" />

                        <AppText style={styles.hideLabel}>{hideLabel}</AppText>
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

    covered: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },

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

    // Paper in both schemes: the slab under it is ink in both. Sized for a word said
    // out loud rather than a sentence read silently, and allowed to wrap because the
    // sentence mode deals whole questions.
    secret: {
        marginTop: 6,
        fontSize: 26,
        fontWeight: 900,
        lineHeight: 26 * 1.2,
        letterSpacing: -0.7,
        color: Brand.textOnAccent
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
