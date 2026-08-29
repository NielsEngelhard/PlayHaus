import AppText from "@/components/text/AppText";
import { Brand, Gradients, accentInkColor, linearGradient, withAlpha } from "@/constants/theme";
import { useAccent } from "@/features/theme/AccentContext";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { Pressable } from "react-native";

interface Props {
    text: string,
    onPress: () => void,
    disabled?: boolean
}

/**
 * The one thing a setup screen is for, at the bottom of it.
 *
 * Louder than anything else in the app: full width, gradient fill, and a glow in its own
 * colour rather than the flat ink shadow the cards above it wear. Nothing else on the
 * page should look like this, which is why it is a component and not a `TextButton`
 * variant — the variants are for buttons that sit among others.
 */
export default function StartGameButton({ text, onPress, disabled = false }: Props) {
    const styles = useStyles();
    const theme = useTheme();

    /*
     * The colour it starts. Orange wherever nothing is lent, which is every caller that
     * is not a settings card — see `AccentContext`.
     *
     * The glow is the accent's own colour at low strength rather than a fixed orange:
     * a button that throws light in a colour it is not is what makes a themed one look
     * borrowed.
     */
    const accent = useAccent();
    const fill = accent?.gradient ?? Gradients.primary;
    const flat = accent?.color ?? Brand.primary;
    const ink = accent === null ? Brand.textOnAccent : accentInkColor(accent.ink);

    const glow = `0 16px 26px -16px ${withAlpha(flat, 0.9)}`;

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityState={{ disabled }}
            style={[
                styles.button,
                linearGradient(fill),
                theme.scheme === 'dark'
                    // Outlined in the lightest stop of its own gradient, which is what
                    // keeps the edge visible once there is no ink line to draw it with.
                    ? { borderColor: fill[0], boxShadow: `0 16px 26px -14px ${withAlpha(flat, 0.85)}` }
                    : { boxShadow: `3px 3px 0 0 ${Brand.ink}, ${glow}` },
                disabled && styles.disabled
            ]}
        >
            <AppText style={[styles.label, { color: ink }]}>{text}</AppText>

            <Feather name='arrow-right' size={19} color={ink} />
        </Pressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    button: {
        height: 62,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        // The border and the glow are drawn from the accent at the call site — only the
        // light scheme's ink line is a constant.
        borderColor: theme.colors.border
    },
    // The same half-strength every other blocked control in the app wears.
    disabled: {
        opacity: 0.5
    },
    label: {
        fontSize: 18,
        fontWeight: 900,
        letterSpacing: 0.4,
        color: Brand.textOnAccent
    }
}))
