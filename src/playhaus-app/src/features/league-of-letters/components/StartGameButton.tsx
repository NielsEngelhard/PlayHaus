import AppText from "@/components/text/AppText";
import { Brand, Gradients, linearGradient } from "@/constants/theme";
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

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityState={{ disabled }}
            style={[styles.button, linearGradient(Gradients.primary), disabled && styles.disabled]}
        >
            <AppText style={styles.label}>{text}</AppText>

            <Feather name='arrow-right' size={19} color={Brand.textOnAccent} />
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
        // Dark outlines it in a lighter orange than the fill, which is what keeps the
        // edge visible once there is no ink line to draw it with.
        borderColor: theme.scheme === 'dark' ? '#FF8557' : theme.colors.border,
        boxShadow: theme.scheme === 'dark'
            ? '0 16px 26px -14px rgba(254, 90, 29, 0.85)'
            : '3px 3px 0 0 #0F0D12, 0 16px 26px -16px rgba(254, 90, 29, 0.9)'
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
