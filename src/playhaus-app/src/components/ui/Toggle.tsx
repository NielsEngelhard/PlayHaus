import { Brand, withAlpha } from "@/constants/theme";
import { useAccent } from "@/features/theme/AccentContext";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { Pressable, View } from "react-native";

interface Props {
    value: boolean,
    onValueChange: (value: boolean) => void,
    /** The switch is unlabelled to the eye — the row next to it carries the name. */
    label: string,
    /** Greyed out and unpressable, e.g. while a save is in the air. */
    disabled?: boolean
}

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 31;
const KNOB_SIZE = 25;
const KNOB_INSET = 3;

// No border on the track any more, so the knob travels the full width less itself and
// the same inset at both ends.
const KNOB_TRAVEL_END = TRACK_WIDTH - KNOB_SIZE - KNOB_INSET;

/**
 * An on/off switch in the app's own hand. React Native's `Switch` renders as the OS
 * draws it, which sits oddly next to the rest of the UI, so this is drawn from scratch.
 *
 * Soft rather than outlined: the settings pages took the 2px lines and hard shadows off
 * everything you touch, and the switch says "on" by glowing in its own colour instead of
 * by being fenced in ink. The glow is what makes the state legible at a glance — an
 * accent track that threw no light would read as a printed pill, not a live control.
 */
export default function Toggle({ value, onValueChange, label, disabled = false }: Props) {
    const styles = useStyles();
    const theme = useTheme();

    // What "on" looks like, in the colour of whatever this switch belongs to. Orange
    // wherever nothing is lent — see `AccentContext`.
    const accent = useAccent();
    const fill = accent?.color ?? theme.colors.primary;

    return (
        <Pressable
            onPress={() => onValueChange(!value)}
            disabled={disabled}
            accessibilityRole='switch'
            accessibilityLabel={label}
            accessibilityState={{ checked: value, disabled }}
            style={[
                styles.track,
                value
                    ? { backgroundColor: fill, boxShadow: `0 6px 14px -6px ${withAlpha(fill, 0.7)}` }
                    : styles.trackOff,
                disabled && styles.trackDisabled
            ]}
        >
            <View
                style={[
                    styles.knob,
                    { left: value ? KNOB_TRAVEL_END : KNOB_INSET }
                ]}
            />
        </Pressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    track: {
        width: TRACK_WIDTH,
        height: TRACK_HEIGHT,
        flexShrink: 0,
        justifyContent: 'center',
        borderRadius: 999
    },
    trackOff: {
        backgroundColor: theme.colors.muted
    },
    // The same half-strength the buttons use, so a blocked control reads the
    // same way wherever it sits.
    trackDisabled: {
        opacity: 0.5
    },
    knob: {
        position: 'absolute',
        width: KNOB_SIZE,
        height: KNOB_SIZE,
        borderRadius: 999,
        // Paper in both schemes: the knob sits on an accent when on and on `muted` when
        // off, neither of which flips with the canvas, so the knob must not either.
        backgroundColor: Brand.textOnAccent,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)'
    }
}))
