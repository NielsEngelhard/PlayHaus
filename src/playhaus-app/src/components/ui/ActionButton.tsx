import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";

/**
 * How much room the button is given.
 *
 * `regular` is the one that closes a card — the resume button on a reconnect row. `large`
 * is the one that closes a screen, and everything about it scales up together: a 62pt
 * button with 15pt type on it reads as a mistake rather than as emphasis.
 */
type Size = 'regular' | 'large';

const SIZES: Record<Size, { height: number, radius: number, label: number, tracking: number, gap: number, icon: number }> = {
    regular: { height: 50, radius: 14, label: 15, tracking: 0.3, gap: 9, icon: 17 },
    large: { height: 62, radius: 18, label: 18, tracking: 0.4, gap: 10, icon: 19 }
};

interface Props {
    text: string,
    onPress: () => void,
    disabled?: boolean,
    /** Trailing icon. Defaults to the arrow that says "and then this". */
    icon?: keyof typeof Feather.glyphMap,
    size?: Size,
    /** For layout only — how the button sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
}

/**
 * The one committing button on a screen: join this room, play the next round.
 *
 * Takes the scheme's loudest neutral rather than a brand accent — ink on paper, lemon on
 * ink. That keeps it unmistakably the primary action without competing with the orange
 * and mint the game itself uses to mean something.
 *
 * `StartGameButton` is the same idea in a game's own colour, for the one screen where
 * starting the game *is* the subject.
 */
export default function ActionButton({
    text,
    onPress,
    disabled = false,
    icon = 'arrow-right',
    size = 'regular',
    style
}: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const metrics = SIZES[size];
    const ink = theme.scheme === 'dark' ? Brand.ink : Brand.textOnAccent;

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityState={{ disabled }}
            style={[
                styles.button,
                {
                    height: metrics.height,
                    borderRadius: metrics.radius,
                    gap: metrics.gap
                },
                disabled && styles.disabled,
                style
            ]}
        >
            <AppText
                style={[styles.label, { fontSize: metrics.label, letterSpacing: metrics.tracking }]}
            >
                {text}
            </AppText>

            <Feather name={icon} size={metrics.icon} color={ink} />
        </Pressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.lemon : theme.colors.text,
        backgroundColor: theme.scheme === 'dark' ? theme.colors.lemon : theme.colors.text,
        boxShadow: theme.scheme === 'dark'
            ? '0 16px 26px -16px rgba(255, 229, 56, 0.6)'
            : '3px 3px 0 0 rgba(15, 13, 18, 0.25), 0 16px 26px -16px rgba(15, 13, 18, 0.8)'
    },
    // The same half-strength every other blocked control in the app wears.
    disabled: {
        opacity: 0.5
    },
    label: {
        fontWeight: 900,
        color: theme.scheme === 'dark' ? Brand.ink : Brand.textOnAccent
    }
}))
