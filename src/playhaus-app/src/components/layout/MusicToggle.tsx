import PopPressable from "@/components/ui/PopPressable";
import { Brand, accentInkColor, withAlpha } from "@/constants/theme";
import { useMusicScene } from "@/features/audio/MusicContext";
import { useAuth } from "@/features/auth/useAuth";
import { useT } from "@/features/i18n/LanguageContext";
import { useProfile } from "@/features/settings/useProfile";
import { useAccent } from "@/features/theme/AccentContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";

interface Props {
    // `chrome` is the standing outlined circle the app `Header` wears.
    variant?: 'chrome' | 'subtle' | 'band'
}

const SIZE = 32;
const SUBTLE_SIZE = 30;
const BAND_SIZE = 34;

// Turns the background music off and on, from wherever it is playing.
export default function MusicToggle({ variant = 'chrome' }: Props) {
    const scene = useMusicScene();
    const { user } = useAuth();
    const { updateEnableMusic, saving } = useProfile();
    const { colors } = useTheme();
    const styles = useStyles();
    const t = useT();

    // Same wash-and-ink answer as `ThemeToggle`'s band variant, and for the same reason.
    const accent = useAccent();
    const band = variant === 'band' && accent !== null;

    const playing = user?.enableMusic === true;

    // After the hooks, never before: this component appears and disappears with the scene.
    if (scene === null || user === null) return null;

    return (
        <PopPressable
            onPress={() => updateEnableMusic(!playing)}
            // The save is confirmed rather than optimistic, so the icon does not move until the account holds the new value.
            disabled={saving}
            accessibilityRole='switch'
            accessibilityState={{ checked: playing, disabled: saving }}
            accessibilityLabel={playing ? t('chrome.muteMusic') : t('chrome.unmuteMusic')}
            style={band
                ? [styles.buttonBand, { backgroundColor: withAlpha(Brand.ink, accent.ink === 'paper' ? 0.22 : 0.08) }]
                : variant === 'subtle' ? styles.buttonSubtle : styles.button}
        >
            <Feather
                name={playing ? 'music' : 'volume-x'}
                size={16}
                // Muted music gets a muted icon: off is a resting state, not a warning, so it recedes rather than colouring itself in.
                color={band
                    ? withAlpha(accentInkColor(accent.ink), playing ? 1 : 0.55)
                    : playing ? colors.text : colors.textMuted}
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
        // Matches `ThemeToggle`: the two sit side by side and any difference between them would read as one of them being a different kind of thing.
        ...theme.shadows.hardSmall
    },
    // No outline and no shadow, like the back pill and the theme button it shares a band with.
    buttonBand: {
        width: BAND_SIZE,
        height: BAND_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999
    },
    // The lobby bar's register: a wash instead of a border, square-ish like the back chip beside it rather than the circle the standing button wears.
    buttonSubtle: {
        width: SUBTLE_SIZE,
        height: SUBTLE_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: theme.scheme === 'dark'
            ? 'rgba(245, 243, 239, 0.08)'
            : withAlpha(Brand.ink, 0.06)
    }
}));
