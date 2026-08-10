import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { ButtonVariants, FontSizes, SolidButton, type ButtonVariant } from "@/constants/theme";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

interface Props {
    text: string
    onPress: () => void
    /**
     * `false` (the default) sizes the button to its label. `true` stretches it across
     * the parent, label still centred.
     */
    fullWidth?: boolean
    disabled?: boolean
    /** Defaults to `secondary`, the fill `SolidButton` already carries. */
    variant?: ButtonVariant
    /** For layout only — how the button sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
}

/** The app's standard solid button: hard border, hard shadow, uppercase label. */
export default function TextButton({
    text,
    onPress,
    fullWidth = false,
    disabled = false,
    variant = 'secondary',
    style
}: Props) {
    const { fill, label } = ButtonVariants[variant];

    return (
        <PopPressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityState={{ disabled }}
            style={[
                styles.button,
                { backgroundColor: fill },
                fullWidth ? styles.fullWidth : styles.fitText,
                disabled && styles.disabled,
                style
            ]}
        >
            <AppText style={[styles.text, { color: label }]}>{text}</AppText>
        </PopPressable>
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
        textTransform: 'uppercase'
    }
})
