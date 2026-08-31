import PopPressable from "@/components/ui/PopPressable";
import { Brand, accentInkColor, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { useAccent } from "@/features/theme/AccentContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme, useThemeMode } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";

const SIZE = 32;
const BAND_SIZE = 34;

interface Props {
    /**
     * `chrome` is the standing outlined circle the app `Header` wears. `band` redraws
     * it for an accent band — a translucent ink wash, matching the `BackChip` at the
     * other end of the same row.
     */
    variant?: 'chrome' | 'band'
}

/**
 * Flips the app between light and dark. Lives at the right-hand end of the `Header`,
 * so it is in the same place on every page — and on the pages that paint their own
 * band, at the right-hand end of that instead.
 *
 * The icon shows what a press would give you rather than where you are — a moon while
 * the lights are on. That is the convention people already read on every other app's
 * version of this button, and a sun on a light page is a control that looks like it has
 * nothing left to do.
 */
export default function ThemeToggle({ variant = 'chrome' }: Props) {
    const { scheme, toggle } = useThemeMode();
    const { colors } = useTheme();
    const styles = useStyles();
    const t = useT();

    // Same wash-and-ink answer as `BackChip`'s band variant, and for the same reason:
    // the two bookend one row and have to read as a pair.
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
        // No house tilt here, unlike the cards: this one is a circle, so a rotation
        // would cost a transform — the one `PopPressable` needs for its press — and
        // show nothing for it.
        ...theme.shadows.hardSmall
    },
    // No outline and no shadow, like the back pill it mirrors: a wash is all the chrome
    // a saturated band needs.
    bandButton: {
        width: BAND_SIZE,
        height: BAND_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999
    }
}));
