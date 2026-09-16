import AppText from "@/components/text/AppText";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { usePressPop } from "@/components/ui/usePressPop";
import { Brand, accentInkColor, withAlpha } from "@/constants/theme";
import { useAccent } from "@/features/theme/AccentContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";

interface Props {
    text: string,
    onPress: () => void,
    disabled?: boolean
}

// The one thing a setup screen is for, at the bottom of it.
export default function StartGameButton({ text, onPress, disabled = false }: Props) {
    const styles = useStyles();
    const pop = usePressPop();

    // The colour it starts.
    const accent = useAccent();
    const flat = accent?.color ?? Brand.primary;
    const ink = accent === null ? Brand.textOnAccent : accentInkColor(accent.ink);

    return (
        <AnimatedPressable
            onPress={onPress}
            disabled={disabled}
            onPressIn={pop.onPressIn}
            onPressOut={pop.onPressOut}
            onHoverIn={pop.onHoverIn}
            onHoverOut={pop.onHoverOut}
            accessibilityRole='button'
            accessibilityState={{ disabled }}
            style={[
                styles.button,
                {
                    backgroundColor: flat,
                    boxShadow: `0 12px 24px -12px ${withAlpha(flat, 0.9)}`
                },
                disabled && styles.disabled,
                pop.animatedStyle
            ]}
        >
            <AppText style={[styles.label, { color: ink }]}>{text}</AppText>

            <Feather name='arrow-right' size={18} color={ink} />
        </AnimatedPressable>
    )
}

const useStyles = createThemedStyles(() => ({
    button: {
        height: 58,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderRadius: 999
    },
    // The same half-strength every other blocked control in the app wears.
    disabled: {
        opacity: 0.5
    },
    label: {
        fontSize: 17,
        fontWeight: 800,
        letterSpacing: 0.2,
        color: Brand.textOnAccent
    }
}))
