import AppText from "@/components/text/AppText";
import { accentInkColor } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { useAccent } from "@/features/theme/AccentContext";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { Pressable, View } from "react-native";

interface Props {
    value: boolean,
    onValueChange: (value: boolean) => void,
    /**
     * What this switch is for. Read out by the screen reader, and the row beside it
     * carries the same words to the eye — the stamp itself only ever says on or off.
     */
    label: string,
    /** Greyed out and unpressable, e.g. while a save is in the air. */
    disabled?: boolean
}

const STAMP_WIDTH = 66;
const STAMP_HEIGHT = 38;

/**
 * An on/off switch in the app's own hand. React Native's `Switch` renders as the OS
 * draws it, which sits oddly next to the rest of the UI, so this is drawn from scratch.
 *
 * A stamp rather than a slider. The app's hand is a 2px ink outline with a hard offset
 * shadow thrown off it — it is on the buttons, the avatars, the marks and the role cards,
 * and the switch was one of the two controls it had quietly been dropped from. So "on" is
 * an inked lozenge filled in the accent, tilted three degrees off square and landing with
 * the same hard shadow everything else in the app casts; "off" is a flat dashed outline
 * with nothing in it.
 *
 * The state is spelled out as well as drawn. Fill, depth and the word all carry the same
 * one bit, which is what makes the setting readable at a glance, at arm's length, and by
 * someone the accent's hue does nothing for. It is also why the switch needs the
 * catalogue where it used to need none.
 *
 * The tilt is fixed and cosmetic: it lives on an absolutely-positioned child so the
 * transform can never reach the layout, and the `Pressable` underneath stays square. With
 * `hitSlop` that square clears the 44pt target without the row it sits in growing.
 */
export default function Toggle({ value, onValueChange, label, disabled = false }: Props) {
    const styles = useStyles();
    const t = useT();
    const theme = useTheme();

    // What "on" looks like, in the colour of whatever this switch belongs to. Orange
    // wherever nothing is lent — see `AccentContext`.
    const accent = useAccent();
    const fill = accent?.color ?? theme.colors.primary;

    // Which of the two inks the word is drawn in once the lozenge is filled. Asking the
    // accent rather than assuming paper is the whole point: One of Us lends a violet
    // pale enough that paper on top of it disappears.
    const ink = accentInkColor(accent?.ink ?? 'paper');

    return (
        <Pressable
            onPress={() => onValueChange(!value)}
            disabled={disabled}
            hitSlop={{ top: 4, bottom: 4 }}
            accessibilityRole='switch'
            accessibilityLabel={label}
            accessibilityState={{ checked: value, disabled }}
            style={[styles.hit, disabled && styles.disabled]}
        >
            <View
                style={[
                    styles.stamp,
                    value
                        // The fill is inline rather than in the sheet because it comes
                        // from the accent this switch was lent, and `createThemedStyles`
                        // builds one stylesheet per scheme for the whole app.
                        ? [styles.stampOn, { backgroundColor: fill }]
                        : styles.stampOff
                ]}
            >
                <AppText style={[styles.word, { color: value ? ink : theme.colors.textFaint }]}>
                    {value ? t('common.on') : t('common.off')}
                </AppText>
            </View>
        </Pressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    hit: {
        width: STAMP_WIDTH,
        height: STAMP_HEIGHT,
        flexShrink: 0
    },
    // The same half-strength the buttons use, so a blocked control reads the
    // same way wherever it sits.
    disabled: {
        opacity: 0.5
    },
    // Filling the hit box absolutely, so the rotation below is free to spill a
    // millimetre past it without any of it reaching the row's layout.
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
        transform: [{ rotate: '-3deg' }],
        ...theme.shadows.hard
    },
    // No fill and no shadow: an unset switch is a box waiting to be stamped, and the
    // dashed line is the same one every empty slot in the app is drawn with.
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
