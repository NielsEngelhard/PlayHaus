import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { haptic } from "@/utils/haptics";
import Feather from "@expo/vector-icons/Feather";
import { View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";

interface Props {
    /** A digit or a minus sign to append to whatever is being typed. */
    onKey: (character: string) => void
    onBackspace: () => void
    disabled?: boolean
    /** For layout only — how the pad sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
}

/** Three columns of four, the way a phone draws a number. */
const ROWS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9']
] as const;

/**
 * How tall a key is, off the window rather than off a measurement.
 *
 * The pad decides its own height, and measuring something in order to size it is a
 * layout loop waiting to happen — the same reason `LetterKeyboard` picks its keys this
 * way. The floor is 46 so a key clears the 44-point tap target on the shortest phone
 * this runs on.
 */
function keyHeightFor(windowHeight: number): number {
    if (windowHeight < 640) return 46;
    if (windowHeight < 780) return 50;
    return 54;
}

/**
 * The pad round 3 types its numbers on, instead of the phone's own keyboard.
 *
 * The system keyboard is what made that round unplayable. It is roughly a third of a
 * phone, it arrives without warning when a field takes focus, and what it covered here
 * was the rest of the form and the button that ends the turn — so the quizmaster typed
 * one number, scrolled, typed the next, and lost sight of who had answered. The rows
 * were inside a scroller inside a flexed card at the time, which meant the scroll under
 * the keyboard was a nested one and fought the outer scroll for every drag.
 *
 * A pad that is simply part of the screen has none of that. It is there before the first
 * tap and it never moves, so the rows above it and the award button are laid out once,
 * around a known height, and stay put for the whole turn.
 *
 * Twelve keys, which is all this round can need: nine digits, a zero, a minus for a
 * guess below nothing, and a backspace. What they produce is characters appended to the
 * raw string a field is holding, not a parsed number — `reviewGuesses` is the one that
 * decides what "-", "1." or "12" adds up to, and it should keep being the one.
 */
export default function NumberPad({ onKey, onBackspace, disabled = false, style }: Props) {
    const t = useT();
    const styles = useStyles();

    const { height } = useWindowDimensions();
    const keyHeight = keyHeightFor(height);

    return (
        <View style={[styles.pad, style]}>
            {ROWS.map(row => (
                <View key={row[0]} style={styles.row}>
                    {row.map(digit => (
                        <Key
                            key={digit}
                            label={digit}
                            height={keyHeight}
                            disabled={disabled}
                            onPress={() => onKey(digit)}
                        />
                    ))}
                </View>
            ))}

            <View style={styles.row}>
                {/* Minus and backspace take the canvas rather than the paper the digits
                    wear, so the two keys that are not a number are the two keys that do
                    not look like one — findable by shape with a thumb, mid-conversation. */}
                <Key
                    label="−"
                    spoken={t('pubquizr.play.pad.minus')}
                    height={keyHeight}
                    disabled={disabled}
                    muted
                    onPress={() => onKey('-')}
                />

                <Key
                    label="0"
                    height={keyHeight}
                    disabled={disabled}
                    onPress={() => onKey('0')}
                />

                <Key
                    spoken={t('pubquizr.play.pad.backspace')}
                    icon="delete"
                    height={keyHeight}
                    disabled={disabled}
                    muted
                    onPress={onBackspace}
                />
            </View>
        </View>
    )
}

interface KeyProps {
    label?: string
    /** What a screen reader says, where the label is a glyph or an icon. */
    spoken?: string
    icon?: keyof typeof Feather.glyphMap
    height: number
    disabled: boolean
    /** The two keys that are not a digit. */
    muted?: boolean
    onPress: () => void
}

function Key({ label, spoken, icon, height, disabled, muted = false, onPress }: KeyProps) {
    const theme = useTheme();
    const styles = useStyles();

    return (
        <PopPressable
            onPress={onPress}
            // The bubble comes from `PopPressable`; the buzz under it is the pad's own,
            // the same lightest tap the letter keyboard uses. Typing is the one place in
            // the app where a touch is worth feeling.
            onPressIn={() => haptic('tap')}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={spoken ?? label}
            accessibilityState={{ disabled }}
            style={[
                styles.key,
                { height },
                muted ? styles.keyMuted : styles.keyDigit,
                disabled && styles.keyDisabled
            ]}
        >
            {icon !== undefined
                ? <Feather name={icon} size={20} color={theme.colors.text} />
                : <AppText style={[styles.keyText, muted && styles.keyTextMuted]}>{label}</AppText>}
        </PopPressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    // Sits on a fill of its own rather than on the page, so the board above it has a
    // bottom edge — the pad is furniture, not another card on the same surface.
    pad: {
        flexShrink: 1,
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderTopWidth: theme.borderWidth,
        borderTopColor: theme.colors.borderSubtle,
        backgroundColor: theme.colors.muted
    },

    row: {
        flexDirection: 'row',
        gap: 6
    },

    key: {
        // Every key shares the row evenly, so one layout covers a 360dp phone and a
        // 600dp content column without a breakpoint anywhere.
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10
    },

    keyDigit: {
        backgroundColor: theme.colors.backgroundSecondary,
        // Seated rather than floating: the shadow is directly underneath, so a key
        // reads as something pressed down into the pad instead of hanging off it.
        ...(theme.scheme === 'dark' ? {} : { boxShadow: '0 2px 0 0 rgba(15, 13, 18, 0.2)' })
    },

    keyMuted: {
        backgroundColor: theme.colors.backgroundElement
    },

    keyText: {
        fontSize: 22,
        fontWeight: 700,
        color: theme.colors.text
    },

    keyTextMuted: {
        fontSize: 20,
        color: theme.colors.textSecondary
    },

    keyDisabled: {
        opacity: 0.5
    }
}))
