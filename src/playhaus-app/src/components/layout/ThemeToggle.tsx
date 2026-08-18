import PopPressable from "@/components/ui/PopPressable";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme, useThemeMode } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";

const SIZE = 32;

/**
 * Flips the app between light and dark. Lives at the right-hand end of the `Header`,
 * so it is in the same place on every page.
 *
 * The icon shows what a press would give you rather than where you are — a moon while
 * the lights are on. That is the convention people already read on every other app's
 * version of this button, and a sun on a light page is a control that looks like it has
 * nothing left to do.
 */
export default function ThemeToggle() {
    const { scheme, toggle } = useThemeMode();
    const { colors } = useTheme();
    const styles = useStyles();

    const goingDark = scheme === 'light';

    return (
        <PopPressable
            onPress={toggle}
            accessibilityRole='button'
            accessibilityLabel={goingDark ? 'Schakel over naar donkere modus' : 'Schakel over naar lichte modus'}
            style={styles.button}
        >
            <Feather
                name={goingDark ? 'moon' : 'sun'}
                size={16}
                color={colors.text}
            />
        </PopPressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    button: {
        width: SIZE,
        height: SIZE,
        // The pill next door is what should shrink when the header runs out of room.
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        borderRadius: 999,
        backgroundColor: theme.colors.backgroundSecondary,
        // No house tilt here, unlike the cards: this one is a circle, so a rotation
        // would cost a transform — the one `PopPressable` needs for its press — and
        // show nothing for it.
        ...(theme.scheme === 'dark' ? {} : { boxShadow: '2px 2px 0 0 #0F0D12' })
    }
}));
