import AppText from "@/components/text/AppText";
import { Colors, FontSizes, SolidButton } from "@/constants/theme";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

interface Props {
    text: string
    onPress: () => void
    /**
     * `false` (the default) sizes the button to its label. `true` stretches it across
     * the parent, label still centred.
     */
    fullWidth?: boolean
    disabled?: boolean
    /** For layout only — how the button sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
}

/** The app's standard solid button: hard border, hard shadow, uppercase label. */
export default function TextButton({
    text,
    onPress,
    fullWidth = false,
    disabled = false,
    style
}: Props) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityState={{ disabled }}
            style={[
                styles.button,
                fullWidth ? styles.fullWidth : styles.fitText,
                disabled && styles.disabled,
                style
            ]}
        >
            <AppText style={styles.text}>{text}</AppText>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    button: SolidButton,
    // A column parent stretches its children by default, so fitting the label means
    // opting out of that rather than doing nothing.
    fitText: {
        alignSelf: 'flex-start',
        flexShrink: 0
    },
    fullWidth: {
        alignSelf: 'stretch',
        width: '100%'
    },
    disabled: {
        opacity: 0.5
    },
    text: {
        fontSize: FontSizes.md,
        fontWeight: 900,
        textTransform: 'uppercase',
        color: Colors.light.textOnAccent
    }
})
