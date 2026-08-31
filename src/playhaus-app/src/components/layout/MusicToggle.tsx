import PopPressable from "@/components/ui/PopPressable";
import { Brand, withAlpha } from "@/constants/theme";
import { useMusicScene } from "@/features/audio/MusicContext";
import { useAuth } from "@/features/auth/useAuth";
import { useT } from "@/features/i18n/LanguageContext";
import { useProfile } from "@/features/settings/useProfile";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";

interface Props {
    /**
     * The quiet version, for a bar that has its own idea of what a control looks like.
     *
     * The lobby's chips are borderless washes rather than the app's hard-edged buttons,
     * and one hard-edged circle among them would read as a different kind of thing. A
     * prop rather than a `style` override because the look is the component's to own —
     * `style` props stay layout-only by convention.
     */
    subtle?: boolean
}

const SIZE = 32;
const SUBTLE_SIZE = 30;

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
export default function MusicToggle({ subtle = false }: Props) {
    const scene = useMusicScene();
    const { user } = useAuth();
    const { updateEnableMusic, saving } = useProfile();
    const { colors } = useTheme();
    const styles = useStyles();
    const t = useT();

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
            style={subtle ? styles.buttonSubtle : styles.button}
        >
            <Feather
                name={playing ? 'music' : 'volume-x'}
                size={16}
                // Muted music gets a muted icon: off is a resting state, not a warning, so it
                // recedes rather than colouring itself in.
                color={playing ? colors.text : colors.textMuted}
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
