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

// The step between reading the answer and scoring it.
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

    // Deliberately quieter than the two buttons it leads to.
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
        ...theme.shadows.hardSmall
    },

    locked: {
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundElement,
        boxShadow: 'none'
    },

    // Ink on mint in both schemes, because the fill is mint in both.
    label: {
        fontSize: 14.5,
        fontWeight: 900,
        color: Brand.ink
    },

    // The locked state is not mint — it falls back to `backgroundElement` — so it takes the scheme's own muted ink rather than the fixed black above.
    lockedLabel: {
        color: theme.colors.textMuted
    },
}))
