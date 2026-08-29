import AppText from "@/components/text/AppText";
import TextHint from "@/components/text/TextHint";
import PopPressable from "@/components/ui/PopPressable";
import { Brand } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    /** What the gate itself says, e.g. "Score Sanne" or "Vote Tom out". */
    label: string
    /** The line under it, saying which of the two states you are in. */
    hint: string
    /** Open. Until it is, there is nothing to decide on. */
    unlocked: boolean
    onPress: () => void
}

/**
 * The step between reading the answer and scoring it.
 *
 * A deliberate extra tap, and the reason is the phone itself. It is being handed round
 * a table, put down, picked up and turned to face someone else, all while the two
 * biggest buttons on the screen are Correct and Wrong — a stray thumb during that hand
 * over scores a question nobody has answered yet, and the game has no undo. Standing
 * this in front of them means the only thing an accidental press can reach is a button
 * whose whole effect is to show two more buttons.
 *
 * Locked until whatever it gates has been read, because deciding on something you have
 * not read is the mistake the whole sequence exists to prevent. The line underneath says
 * which of the two states you are in rather than leaving a grey button to explain itself.
 *
 * One of Us leans on it for the same reason from the other direction: voting somebody
 * out is just as final as scoring a question, and just as easy to do with a thumb while
 * the phone is moving.
 */
export default function ValidateButton({ label, hint, unlocked, onPress }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    return (
        <View style={styles.container}>
            <PopPressable
                onPress={onPress}
                disabled={!unlocked}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ disabled: !unlocked }}
                style={[styles.button, !unlocked && styles.locked]}
            >
                <Feather
                    name="send"
                    size={18}
                    color={unlocked ? Brand.ink : theme.colors.textMuted}
                />

                <AppText style={[styles.label, !unlocked && styles.lockedLabel]}>
                    {label}
                </AppText>
            </PopPressable>

            <TextHint text={hint} />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        flexShrink: 0
    },

    // Deliberately quieter than the two buttons it leads to: this is a gate, not a
    // decision, and it should not look like the thing being decided.
    button: {
        height: 66,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.mint,
        ...(theme.scheme === 'dark' ? {} : theme.shadows.hardSmall)
    },

    locked: {
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundElement,
        boxShadow: 'none'
    },

    // Ink on mint in both schemes, because the fill is mint in both — `theme.colors`
    // spreads `Brand` into each palette, so this button does not change colour with the
    // scheme and its label must not either. `theme.colors.text` here was near-white on
    // mint in dark mode. Same pairing `VerdictButtons` uses for Correct.
    label: {
        fontSize: 14.5,
        fontWeight: 900,
        color: Brand.ink
    },

    // The locked state is not mint — it falls back to `backgroundElement` — so it takes
    // the scheme's own muted ink rather than the fixed black above.
    lockedLabel: {
        color: theme.colors.textMuted
    },
}))
