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
    /**
     * `chrome` is the standing outlined circle the app `Header` wears.
     *
     * `subtle` is the quiet version, for a bar that has its own idea of what a control
     * looks like: the lobby's chips are borderless washes rather than the app's
     * hard-edged buttons, and one hard-edged circle among them would read as a different
     * kind of thing.
     *
     * `band` redraws it for an accent band — a translucent ink wash, matching the
     * `ThemeToggle` it stands next to on a board's own header.
     *
     * A prop rather than a `style` override because the look is the component's to own —
     * `style` props stay layout-only by convention. Spelled the same way as
     * `ThemeToggle`'s, because the two are a pair and a boolean here against a variant
     * there would make them look like different kinds of control.
     */
    variant?: 'chrome' | 'subtle' | 'band'
}

const SIZE = 32;
const SUBTLE_SIZE = 30;
const BAND_SIZE = 34;

/**
 * Turns the background music off and on, from wherever it is playing.
 *
 * Only shown where there is something to silence — a lobby or a board — because everywhere
 * else in the app is silent by design, and a mute button on a quiet page is a control that
 * does nothing you can hear. That is also why it reads the claimed scene rather than the
 * route: the multiplayer room serves its lobby, its board and its results off one path, and
 * only two of those three have a soundtrack.
 *
 * Unlike `ThemeToggle` next door, the icon shows the *current* state rather than what a press
 * would give you. A speaker with its waves crossed out means the music is off — that is how
 * every media control anybody has used already works, and borrowing the theme button's
 * show-the-destination convention here would have the icon claim the opposite of the truth.
 *
 * The playing icon is `music` rather than the more obvious `volume-2` because the settings
 * page has already spent that one: `volume-2` is the row for `enableSounds`, the press
 * effects, which is a different switch. Borrowing it here would put the sound-effects icon on
 * a button that does nothing to them.
 *
 * It writes the same account setting as the switch on the profile page, through the same
 * hook, so the two can never disagree.
 */
export default function MusicToggle({ variant = 'chrome' }: Props) {
    const scene = useMusicScene();
    const { user } = useAuth();
    const { updateEnableMusic, saving } = useProfile();
    const { colors } = useTheme();
    const styles = useStyles();
    const t = useT();

    // Same wash-and-ink answer as `ThemeToggle`'s band variant, and for the same reason:
    // the two sit side by side on a board's header and have to read as a pair. An accent
    // is what makes the wash legible, so without one this stays the chrome button.
    const accent = useAccent();
    const band = variant === 'band' && accent !== null;

    const playing = user?.enableMusic === true;

    // After the hooks, never before: this component appears and disappears with the scene,
    // and a hook called on only some of those renders is the one thing React will not have.
    // `user` cannot actually be null while a scene is claimed — the auth gate is upstream of
    // every lobby — but the button writes to an account, so it asks for one rather than
    // assuming.
    if (scene === null || user === null) return null;

    return (
        <PopPressable
            onPress={() => updateEnableMusic(!playing)}
            // The save is confirmed rather than optimistic, so the icon does not move until
            // the account holds the new value. Holding the button shut for that one round
            // trip is what stops a second tap racing the first.
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
                // Muted music gets a muted icon: off is a resting state, not a warning, so it
                // recedes rather than colouring itself in. On a band the ink is the accent's,
                // and the dimming is an alpha over it rather than a colour of its own — the
                // muted greys of the palette are for cream, not for orange or violet.
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
        // Matches `ThemeToggle`: the two sit side by side and any difference between them
        // would read as one of them being a different kind of thing.
        ...theme.shadows.hardSmall
    },
    // No outline and no shadow, like the back pill and the theme button it shares a band
    // with: a wash is all the chrome a saturated band needs. The fill is set at the call
    // site, from the accent's own ink.
    buttonBand: {
        width: BAND_SIZE,
        height: BAND_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999
    },
    // The lobby bar's register: a wash instead of a border, square-ish like the back chip
    // beside it rather than the circle the standing button wears.
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
