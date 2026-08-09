import AppText from "@/components/text/AppText";
import { Colors, FontSizes, SolidButton } from "@/constants/theme";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

/**
 * Which fill the button wears. Only the colour changes — every variant keeps the
 * same border, shadow and label treatment, so a row of them still reads as one
 * family. Use `muted` for the option someone should be able to find but not be
 * pushed towards.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'muted';

const Variants: Record<ButtonVariant, { fill: string, label: string }> = {
    primary: { fill: Colors.light.primary, label: Colors.light.textOnAccent },
    secondary: { fill: Colors.light.secondary, label: Colors.light.textOnAccent },
    // The pale fill can't carry light text, so this one flips to the normal colour.
    muted: { fill: Colors.light.muted, label: Colors.light.text }
};

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
    const { fill, label } = Variants[variant];

    return (
        <Pressable
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
        textTransform: 'uppercase'
    }
})
