import AppText from '@/components/text/AppText';
import AnimatedPressable from '@/components/ui/AnimatedPressable';
import { usePressPop } from '@/components/ui/usePressPop';
import { Brand } from '@/constants/theme';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import Feather from '@expo/vector-icons/Feather';
import { type StyleProp, type ViewStyle } from 'react-native';

interface Props {
    disabled?: boolean
    /** Trailing icon. Left off for the buttons that do not lead anywhere new. */
    icon?: keyof typeof Feather.glyphMap
    onPress: () => void
    /** For layout only — how the button sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
    text: string
}

// The board's one committing button: the game's own violet, and ink on it in both schemes.
export default function PinButton({ disabled = false, icon, onPress, style, text }: Props) {
    const styles = useStyles();
    const pop = usePressPop();

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
            style={[styles.button, disabled && styles.disabled, style, pop.animatedStyle]}
        >
            <AppText style={styles.label}>{text}</AppText>

            {icon !== undefined && <Feather name={icon} size={17} color={Brand.ink} />}
        </AnimatedPressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    button: {
        height: 54,
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        // Violet is pale in both schemes, so the outline is ink in both.
        borderColor: Brand.ink,
        backgroundColor: Brand.violet,
        ...theme.shadows.hard
    },

    // The same half-strength every other blocked control in the app wears.
    disabled: {
        opacity: 0.5
    },

    label: {
        fontSize: 15.5,
        fontWeight: 900,
        color: Brand.ink
    }
}))
