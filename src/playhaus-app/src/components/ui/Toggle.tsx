import AppText from "@/components/text/AppText";
import { usePressPop } from "@/components/ui/usePressPop";
import { accentInkColor } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { useAccent } from "@/features/theme/AccentContext";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { Animated, Pressable } from "react-native";

interface Props {
    value: boolean,
    onValueChange: (value: boolean) => void,
    // What this switch is for.
    label: string,
    /** Greyed out and unpressable, e.g. while a save is in the air. */
    disabled?: boolean
}

const STAMP_WIDTH = 66;
const STAMP_HEIGHT = 38;

// An on/off switch in the app's own hand.
export default function Toggle({ value, onValueChange, label, disabled = false }: Props) {
    const styles = useStyles();
    const t = useT();
    const theme = useTheme();
    // A switch already has its own physicality — the rotated stamp — so only hover animates here.
    const pop = usePressPop({ pressEnabled: false });

    // What "on" looks like, in the colour of whatever this switch belongs to.
    const accent = useAccent();
    const fill = accent?.color ?? theme.colors.primary;

    // Which of the two inks the word is drawn in once the lozenge is filled.
    const ink = accentInkColor(accent?.ink ?? 'paper');

    return (
        <Pressable
            onPress={() => onValueChange(!value)}
            disabled={disabled}
            onHoverIn={pop.onHoverIn}
            onHoverOut={pop.onHoverOut}
            hitSlop={{ top: 4, bottom: 4 }}
            accessibilityRole='switch'
            accessibilityLabel={label}
            accessibilityState={{ checked: value, disabled }}
            style={[styles.hit, disabled && styles.disabled]}
        >
            <Animated.View
                style={[
                    styles.stamp,
                    value
                        // The fill is inline rather than in the sheet because it comes from the accent this switch was lent.
                        ? [styles.stampOn, { backgroundColor: fill }]
                        : styles.stampOff,
                    // A plain `pop.animatedStyle` here would wipe out stampOn's own rotate — RN merges `transform` whole, not element by element — so the rotate is folded into the same transform array as the hover scale instead.
                    { transform: [...(value ? [{ rotate: '-3deg' }] : []), ...pop.animatedStyle.transform] }
                ]}
            >
                <AppText style={[styles.word, { color: value ? ink : theme.colors.textFaint }]}>
                    {value ? t('common.on') : t('common.off')}
                </AppText>
            </Animated.View>
        </Pressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    hit: {
        width: STAMP_WIDTH,
        height: STAMP_HEIGHT,
        flexShrink: 0
    },
    // The same half-strength the buttons use, so a blocked control reads the same way wherever it sits.
    disabled: {
        opacity: 0.5
    },
    // Filling the hit box absolutely, so the rotation below is free to spill a millimetre past it without any of it reaching the row's layout.
    stamp: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 11,
        borderWidth: theme.borderWidth
    },
    stampOn: {
        borderColor: theme.colors.border,
        // The rotate itself is applied inline, folded into the same transform array as the hover scale.
        ...theme.shadows.hard
    },
    // No fill and no shadow: an unset switch is a box waiting to be stamped.
    stampOff: {
        borderColor: theme.colors.borderDashed,
        borderStyle: 'dashed'
    },
    word: {
        fontSize: 14,
        fontWeight: 900,
        letterSpacing: 1.4
    }
}))
