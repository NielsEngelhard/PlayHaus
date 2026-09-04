import type { Mark } from "@/api/calls/league-of-letters";
import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { Brand, withAlpha } from "@/constants/theme";
import { markStyles } from "@/features/league-of-letters/marks";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { playBubble } from "@/utils/bubble-sound";
import { haptic } from "@/utils/haptics";
import { useT } from "@/features/i18n/LanguageContext";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleProp, useWindowDimensions, View, ViewStyle } from "react-native";

interface Props {
    /** The best mark each letter has earned so far, from `keyboardMarks`. */
    marks: Record<string, Mark>,
    onKey: (letter: string) => void,
    onEnter: () => void,
    onBackspace: () => void,
    disabled?: boolean,
    /** For layout only — how the keyboard sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
}

/**
 * QWERTY. Both word lists the game ships with are Dutch and English, and both are typed
 * on this layout, so the language never changes what is drawn here.
 */
const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] as const;

const GAP = 5;

/** How much wider the two action keys are than a letter. */
const ACTION_FLEX = 1.6;

/**
 * The keyboard is the one thing on the screen that must never scroll off, so it gives up
 * height before the board does. Off the window rather than a measurement: it decides its
 * own height, and measuring something to size itself is a layout loop waiting to happen.
 */
function keyHeightFor(windowHeight: number): number {
    if (windowHeight < 640) return 40;
    if (windowHeight < 780) return 44;
    return 47;
}

/** The on-screen keyboard. Fills the width of whatever it is put in. */
export default function LetterKeyboard({ marks, onKey, onEnter, onBackspace, disabled = false, style }: Props) {
    const styles = useStyles();
    const t = useT();

    const { height } = useWindowDimensions();
    const keyHeight = keyHeightFor(height);

    return (
        <View style={[styles.keyboard, style]}>
            <View style={styles.row}>
                {ROWS[0].split('').map(letter => (
                    <LetterKey key={letter} letter={letter} mark={marks[letter]} height={keyHeight} disabled={disabled} onPress={onKey} />
                ))}
            </View>

            {/* No half-key spacers at the ends, unlike a phone keyboard: the design lets
                the nine keys share the full width, so they come out a little wider than
                the ten above rather than sitting in a narrower block. */}
            <View style={styles.row}>
                {ROWS[1].split('').map(letter => (
                    <LetterKey key={letter} letter={letter} mark={marks[letter]} height={keyHeight} disabled={disabled} onPress={onKey} />
                ))}
            </View>

            {/* Backspace left, guess right — the way every phone keyboard puts them, and
                the way a right thumb expects: the key that commits the word sits under
                where the thumb already rests. */}
            <View style={styles.row}>
                <ActionKey icon='delete' label={t('lol.game.clear')} height={keyHeight} disabled={disabled} onPress={onBackspace} variant='delete' />

                {ROWS[2].split('').map(letter => (
                    <LetterKey key={letter} letter={letter} mark={marks[letter]} height={keyHeight} disabled={disabled} onPress={onKey} />
                ))}

                <ActionKey icon='corner-down-left' label={t('lol.game.guess')} height={keyHeight} disabled={disabled} onPress={onEnter} variant='enter' />
            </View>
        </View>
    )
}

interface LetterKeyProps {
    letter: string,
    mark?: Mark,
    height: number,
    disabled: boolean,
    onPress: (letter: string) => void
}

function LetterKey({ letter, mark, height, disabled, onPress }: LetterKeyProps) {
    const theme = useTheme();
    const styles = useStyles();

    const marked = mark ? markStyles(theme)[mark] : undefined;

    return (
        <PopPressable
            onPress={() => onPress(letter)}
            // The bubble comes from `PopPressable`; the buzz under it is the keyboard's own.
            // Typing is the one place in the app where a touch is worth feeling, so this is
            // the lightest tap the phone has — twenty-six keys' worth of anything stronger
            // would be a massage.
            onPressIn={() => haptic('tap')}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityLabel={letter}
            accessibilityState={{ disabled }}
            style={[
                styles.key,
                { height },
                marked
                    ? { backgroundColor: marked.fill, borderColor: marked.border }
                    : styles.keyUnknown,
                disabled && styles.keyDisabled
            ]}
        >
            <AppText style={[styles.keyText, { color: marked?.foreground ?? theme.colors.text }]}>
                {letter}
            </AppText>
        </PopPressable>
    )
}

interface ActionKeyProps {
    icon: keyof typeof Feather.glyphMap,
    label: string,
    height: number,
    disabled: boolean,
    onPress: () => void,
    variant: 'enter' | 'delete'
}

/**
 * Raden and Wissen. A plain `Pressable` rather than a `PopPressable`, so unlike every
 * letter beside them these two make their noise without moving — worth tidying up, but a
 * change to how the keyboard looks rather than how it sounds, so not made here.
 */
function ActionKey({ icon, label, height, disabled, onPress, variant }: ActionKeyProps) {
    const theme = useTheme();
    const styles = useStyles();

    // Enter is the loud one and takes ink on paper, lemon on ink. Delete only ever
    // colours its glyph — a full red key beside nine plain ones reads as a warning.
    const ink = variant === 'enter'
        ? (theme.scheme === 'dark' ? Brand.ink : Brand.textOnAccent)
        : theme.colors.destructiveText;

    return (
        <Pressable
            onPress={onPress}
            // Raden and Wissen are keys too, so they answer a touch like the other
            // twenty-six. Asked for by hand rather than inherited, because this is a bare
            // `Pressable` — see the note on the component above.
            onPressIn={() => { playBubble(); haptic('tap'); }}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityLabel={label}
            accessibilityState={{ disabled }}
            style={[
                styles.key,
                styles.actionKey,
                variant === 'enter' ? styles.enterKey : styles.deleteKey,
                { height },
                disabled && styles.keyDisabled
            ]}
        >
            <Feather name={icon} size={18} color={ink} />
        </Pressable>
    )
}

const useStyles = createThemedStyles(theme => {
    const dark = theme.scheme === 'dark';

    return {
        keyboard: {
            flexShrink: 0,
            width: '100%',
            gap: 6
        },
        row: {
            flexDirection: 'row',
            gap: GAP
        },
        key: {
            // Every key shares the row evenly, so one layout covers a 360dp phone and a
            // 600dp content column without a breakpoint anywhere.
            flex: 1,
            minWidth: 0,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            borderWidth: theme.borderWidth,
            borderColor: theme.colors.border,
            // Seated rather than floating: the shadow is directly underneath, so a key
            // reads as something pressed down into the board instead of hanging off it.
            boxShadow: `0 2px 0 0 ${withAlpha(theme.colors.shadow, 0.85)}`
        },
        keyUnknown: {
            borderColor: theme.colors.border,
            backgroundColor: dark ? theme.colors.backgroundFocus : theme.colors.backgroundSecondary
        },
        actionKey: {
            flex: ACTION_FLEX
        },
        enterKey: {
            borderColor: dark ? theme.colors.lemon : theme.colors.border,
            backgroundColor: dark ? theme.colors.lemon : theme.colors.text
        },
        deleteKey: {
            borderColor: dark ? theme.colors.borderStrong : theme.colors.border,
            backgroundColor: dark ? theme.colors.markAbsent : theme.colors.backgroundSecondary
        },
        keyDisabled: {
            opacity: 0.5
        },
        keyText: {
            fontSize: 15,
            fontWeight: 800
        }
    };
})
