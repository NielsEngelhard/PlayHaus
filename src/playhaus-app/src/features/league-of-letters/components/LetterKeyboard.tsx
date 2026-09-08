import type { Mark } from "@/api/calls/league-of-letters";
import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { Brand, Spacing, withAlpha } from "@/constants/theme";
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

// QWERTY.
const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] as const;

// The strip of nothing between two keys.
const GAP = 4;

// Half a letter key, held empty either side of the home row.
const HOME_INSET_FLEX = 0.5;

/** How much wider backspace is than a letter, in the same units. About iOS's shift. */
const BACKSPACE_FLEX = 1.6;

// The bottom row, in those units again: an empty flank, the bar, the other flank.
const SPACE_FLEX = 6;
const SPACE_FLANK_FLEX = 2;

// The keyboard is the one thing on the screen that must never scroll off, so it gives up height before the board does.
function keyHeightFor(windowHeight: number): number {
    if (windowHeight < 640) return 46;
    if (windowHeight < 780) return 52;
    return 56;
}

// How far past its own edges a key answers a touch.
const HIT_SLOP = { top: 3, bottom: 3, left: GAP / 2, right: GAP / 2 } as const;

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

            {/* Indented by half a key at each end — see `HOME_INSET_FLEX`. */}
            <View style={styles.row}>
                <View style={styles.homeInset} />

                {ROWS[1].split('').map(letter => (
                    <LetterKey key={letter} letter={letter} mark={marks[letter]} height={keyHeight} disabled={disabled} onPress={onKey} />
                ))}

                <View style={styles.homeInset} />
            </View>

            {/* Backspace at the end of the bottom letter row. */}
            <View style={styles.row}>
                {ROWS[2].split('').map(letter => (
                    <LetterKey key={letter} letter={letter} mark={marks[letter]} height={keyHeight} disabled={disabled} onPress={onKey} />
                ))}

                <ActionKey
                    icon='delete'
                    label={t('lol.game.clear')}
                    flex={BACKSPACE_FLEX}
                    height={keyHeight}
                    disabled={disabled}
                    onPress={onBackspace}
                    variant='delete'
                />
            </View>

            {/* The space bar, which here is what commits the word. */}
            <View style={styles.row}>
                <View style={styles.spaceFlank} />

                <ActionKey
                    icon='corner-down-left'
                    label={t('lol.game.guess')}
                    text={t('lol.game.guess')}
                    flex={SPACE_FLEX}
                    height={keyHeight}
                    disabled={disabled}
                    onPress={onEnter}
                    variant='enter'
                />

                <View style={styles.spaceFlank} />
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
            onPressIn={() => haptic('tap')}
            hitSlop={HIT_SLOP}
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
    /** How wide the key is, counted in letter keys. */
    flex: number,
    height: number,
    disabled: boolean,
    onPress: () => void,
    // Written on the key, beside the glyph.
    text?: string,
    variant: 'enter' | 'delete'
}

// Raden and Wissen.
function ActionKey({ icon, label, flex, height, disabled, onPress, text, variant }: ActionKeyProps) {
    const theme = useTheme();
    const styles = useStyles();

    // Enter is the loud one and takes ink on paper, lemon on ink.
    const ink = variant === 'enter'
        ? (theme.scheme === 'dark' ? Brand.ink : Brand.textOnAccent)
        : theme.colors.destructiveText;

    return (
        <Pressable
            onPress={onPress}
            // Raden and Wissen are keys too, so they answer a touch like the other twenty-six.
            onPressIn={() => { playBubble(); haptic('tap'); }}
            hitSlop={HIT_SLOP}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityLabel={label}
            accessibilityState={{ disabled }}
            style={[
                styles.key,
                styles.actionKey,
                variant === 'enter' ? styles.enterKey : styles.deleteKey,
                { flex, height },
                disabled && styles.keyDisabled
            ]}
        >
            <Feather name={icon} size={20} color={ink} />

            {text !== undefined && (
                <AppText style={[styles.actionText, { color: ink }]}>{text}</AppText>
            )}
        </Pressable>
    )
}

const useStyles = createThemedStyles(theme => {
    const dark = theme.scheme === 'dark';

    return {
        keyboard: {
            flexShrink: 0,
            // Stretched to its parent rather than `width.
            alignSelf: 'stretch',
            gap: 6
        },
        row: {
            flexDirection: 'row',
            gap: GAP
        },
        key: {
            // Every key shares the row evenly.
            flex: 1,
            minWidth: 0,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            borderWidth: theme.borderWidth,
            borderColor: theme.colors.border,
            // Seated rather than floating: the shadow is directly underneath.
            boxShadow: `0 2px 0 0 ${withAlpha(theme.colors.shadow, 0.85)}`
        },
        keyUnknown: {
            borderColor: theme.colors.border,
            backgroundColor: dark ? theme.colors.backgroundFocus : theme.colors.backgroundSecondary
        },
        // The glyph and the word side by side, so a bar six keys wide is not a lone icon floating in the middle of it.
        actionKey: {
            flexDirection: 'row',
            gap: Spacing.two
        },
        actionText: {
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: 0.5
        },
        // Empty. Only there to hold the home row in from the ends of its row.
        homeInset: {
            flex: HOME_INSET_FLEX
        },
        // Likewise, either side of the space bar.
        spaceFlank: {
            flex: SPACE_FLANK_FLEX
        },
        enterKey: {
            borderColor: dark ? theme.colors.lemon : theme.colors.border,
            backgroundColor: dark ? theme.colors.lemon : theme.colors.secondary
        },
        deleteKey: {
            borderColor: dark ? theme.colors.borderStrong : theme.colors.border,
            backgroundColor: dark ? theme.colors.markAbsent : theme.colors.backgroundSecondary
        },
        keyDisabled: {
            opacity: 0.5
        },
        keyText: {
            fontSize: 17,
            fontWeight: 800
        }
    };
})
