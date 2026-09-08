import PopPressable from "@/components/ui/PopPressable";
import { Brand, accentInkColor, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { useAccent } from "@/features/theme/AccentContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useScheme, useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";

const SIZE = 32;
const BAND_SIZE = 34;

interface Props {
    // `chrome` is the standing outlined circle the app `Header` wears.
    variant?: 'chrome' | 'band'
}

// Flips the app between light and dark.
export default function ThemeToggle({ variant = 'chrome' }: Props) {
    const { scheme, toggle } = useScheme();
    const { colors } = useTheme();
    const styles = useStyles();
    const t = useT();

    // Same wash-and-ink answer as `BackChip`'s band variant, and for the same reason.
    const accent = useAccent();
    const band = variant === 'band' && accent !== null;
    const glyph = band ? accentInkColor(accent.ink) : colors.text;
    const bandFill = band
        ? withAlpha(Brand.ink, accent.ink === 'paper' ? 0.22 : 0.08)
        : undefined;

    const goingDark = scheme === 'light';

    return (
        <PopPressable
            onPress={toggle}
            accessibilityRole='button'
            accessibilityLabel={goingDark ? t('chrome.toDarkMode') : t('chrome.toLightMode')}
            style={band ? [styles.bandButton, { backgroundColor: bandFill }] : styles.button}
        >
            <Feather
                name={goingDark ? 'moon' : 'sun'}
                size={16}
                color={glyph}
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
        // No house tilt here, unlike the cards.
        ...theme.shadows.hardSmall
    },
    // No outline and no shadow, like the back pill it mirrors: a wash is all the chrome a saturated band needs.
    bandButton: {
        width: BAND_SIZE,
        height: BAND_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999
    }
}));
