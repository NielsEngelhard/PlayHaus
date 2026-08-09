import type { Mark } from "@/api/calls/league-of-letters";
import AppText from "@/components/text/AppText";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import { MARK_STYLES } from "@/features/league-of-letters/marks";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from "react-native";

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

const GAP = Spacing.one;

/** How much wider the two action keys are than a letter. */
const ACTION_FLEX = 1.5;

/**
 * The keyboard is the one thing on the screen that must never scroll off, so it gives up
 * height before the board does. Off the window rather than a measurement: it decides its
 * own height, and measuring something to size itself is a layout loop waiting to happen.
 */
function keyHeightFor(windowHeight: number): number {
    if (windowHeight < 640) return 40;
    if (windowHeight < 780) return 44;
    return 48;
}

/** The on-screen keyboard. Fills the width of whatever it is put in. */
export default function LetterKeyboard({ marks, onKey, onEnter, onBackspace, disabled = false, style }: Props) {
    const { height } = useWindowDimensions();
    const keyHeight = keyHeightFor(height);

    return (
        <View style={[styles.keyboard, style]}>
            <View style={styles.row}>
                {ROWS[0].split('').map(letter => (
                    <LetterKey key={letter} letter={letter} mark={marks[letter]} height={keyHeight} disabled={disabled} onPress={onKey} />
                ))}
            </View>

            <View style={styles.row}>
                {/* Half a key at each end, so the nine keys stay centred under the ten above. */}
                <View style={styles.spacer} />

                {ROWS[1].split('').map(letter => (
                    <LetterKey key={letter} letter={letter} mark={marks[letter]} height={keyHeight} disabled={disabled} onPress={onKey} />
                ))}

                <View style={styles.spacer} />
            </View>

            <View style={styles.row}>
                <ActionKey icon='corner-down-left' label='Raden' height={keyHeight} disabled={disabled} onPress={onEnter} />

                {ROWS[2].split('').map(letter => (
                    <LetterKey key={letter} letter={letter} mark={marks[letter]} height={keyHeight} disabled={disabled} onPress={onKey} />
                ))}

                <ActionKey icon='delete' label='Wissen' height={keyHeight} disabled={disabled} onPress={onBackspace} />
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
    const marked = mark ? MARK_STYLES[mark] : undefined;

    return (
        <Pressable
            onPress={() => onPress(letter)}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityLabel={letter}
            accessibilityState={{ disabled }}
            style={[
                styles.key,
                { height },
                marked ? { backgroundColor: marked.fill } : styles.keyUnknown,
                disabled && styles.keyDisabled
            ]}
        >
            <AppText style={[styles.keyText, { color: marked?.foreground ?? Colors.light.text }]}>
                {letter}
            </AppText>
        </Pressable>
    )
}

interface ActionKeyProps {
    icon: keyof typeof Feather.glyphMap,
    label: string,
    height: number,
    disabled: boolean,
    onPress: () => void
}

function ActionKey({ icon, label, height, disabled, onPress }: ActionKeyProps) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityLabel={label}
            accessibilityState={{ disabled }}
            style={[styles.key, styles.actionKey, { height }, disabled && styles.keyDisabled]}
        >
            <Feather name={icon} size={18} color={Colors.light.text} />
        </Pressable>
    )
}

const styles = StyleSheet.create({
    keyboard: {
        width: '100%',
        gap: GAP
    },
    row: {
        flexDirection: 'row',
        gap: GAP
    },
    spacer: {
        flex: 0.5
    },
    key: {
        // Every key shares the row evenly, so one layout covers a 360dp phone and a
        // 600dp content column without a breakpoint anywhere.
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.light.border,
        borderRadius: 10,
        ...Shadows.hardSmall
    },
    keyUnknown: {
        backgroundColor: Colors.light.backgroundSecondary
    },
    actionKey: {
        flex: ACTION_FLEX,
        backgroundColor: Colors.light.muted
    },
    keyDisabled: {
        opacity: 0.5
    },
    keyText: {
        fontSize: FontSizes.md,
        fontWeight: 900
    }
})
