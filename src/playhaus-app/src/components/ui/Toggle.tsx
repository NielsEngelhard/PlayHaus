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

const TRACK_WIDTH = 56;
const TRACK_HEIGHT = 32;
const TRACK_BORDER = 2;
const KNOB_SIZE = 22;
const KNOB_INSET = 3;

// Absolute children sit inside the border, so the knob travels the padding box rather
// than the full track.
const KNOB_TRAVEL_END = TRACK_WIDTH - TRACK_BORDER * 2 - KNOB_SIZE - KNOB_INSET;

/**
 * An on/off switch in the app's own hand: hard border, hard shadow, no platform chrome.
 * React Native's `Switch` renders as the OS draws it, which sits oddly next to the rest
 * of the UI, so this is drawn from scratch.
 */
export default function Toggle({ value, onValueChange, label, disabled = false }: Props) {
    const styles = useStyles();

    return (
        <Pressable
            onPress={() => onValueChange(!value)}
            disabled={disabled}
            accessibilityRole='switch'
            accessibilityLabel={label}
            accessibilityState={{ checked: value, disabled }}
            style={[
                styles.track,
                value ? styles.trackOn : styles.trackOff,
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
        borderRadius: 999,
        borderWidth: TRACK_BORDER,
        borderColor: theme.colors.border
    },
    trackOn: {
        backgroundColor: theme.colors.primary
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
        borderWidth: 2,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    }
}))
