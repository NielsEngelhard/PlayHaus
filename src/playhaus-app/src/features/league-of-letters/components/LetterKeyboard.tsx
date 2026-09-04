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

/**
 * QWERTY. Both word lists the game ships with are Dutch and English, and both are typed
 * on this layout, so the language never changes what is drawn here.
 */
const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] as const;

/**
 * The strip of nothing between two keys. Four rather than five: ten keys to a row means
 * nine of these, so every dp here is nine dp taken off the width the letters share — and
 * the gaps are given back as `hitSlop` below, so closing them costs no accuracy.
 */
const GAP = 4;

/**
 * Half a letter key, held empty either side of the home row.
 *
 * The whole shape of this keyboard is the phone's, because everybody who plays this has
 * typed a hundred thousand words on that one and a thumb aims where the last keyboard
 * put things. So ASDFGHJKL hangs indented under QWERTYUIOP the way it does everywhere
 * else, rather than nine wider keys sharing the full width.
 *
 * Drawn as an empty view at either end rather than as padding on the row: padding would
 * need the row's width in dp, and nothing here measures itself — the flex box already
 * knows how wide a key is, and half of one is `0.5` of it.
 */
const HOME_INSET_FLEX = 0.5;

/** How much wider backspace is than a letter, in the same units. About iOS's shift. */
const BACKSPACE_FLEX = 1.6;

/**
 * The bottom row, in those units again: an empty flank, the bar, the other flank.
 *
 * Six of ten is roughly the space bar's share of an iPhone's bottom row once 123, the
 * globe and return are counted, and it is what makes this read as a space bar rather
 * than as a fourth row of keys. The flanks stay empty: this keyboard has no numbers, no
 * emoji and no language to switch to, and filling them for the sake of symmetry would
 * put two dead keys under the two spots a thumb rests on.
 */
const SPACE_FLEX = 6;
const SPACE_FLANK_FLEX = 2;

/**
 * The keyboard is the one thing on the screen that must never scroll off, so it gives up
 * height before the board does. Off the window rather than a measurement: it decides its
 * own height, and measuring something to size itself is a layout loop waiting to happen.
 *
 * The floor is 46 for the reason `NumberPad` gives for its own: that is what clears the
 * 44-point tap target on the shortest phone this runs on, and this keyboard had been
 * sitting under it. The two steps above go a little past the pad's, because this is the
 * one keypad in the app that gets pressed five times a word, six words a round.
 *
 * The board above is what pays for it, and it is built to: `GuessGrid` fits its tiles to
 * whatever box it is left, and on a normal phone those tiles are already pinned at their
 * own cap with room to spare. The space bar took a fourth row's worth of that room,
 * which is why these steps have not grown any further.
 */
function keyHeightFor(windowHeight: number): number {
    if (windowHeight < 640) return 46;
    if (windowHeight < 780) return 52;
    return 56;
}

/**
 * How far past its own edges a key answers a touch.
 *
 * The strip between two keys is a few dp of nothing, and a thumb landing in it does
 * nothing at all — on a row of ten keys that is the commonest way to mistype. Half the
 * gap either side hands those presses to the nearer key, which is what the finger meant.
 * Vertical is smaller on purpose: above the top row is the board and below the bottom row
 * is the edge of the phone, and neither of those is a key with presses to spare.
 */
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

            {/* Backspace at the end of the bottom letter row, which is where a phone puts
                it and where a right thumb goes looking for it. Nothing stands where shift
                would: this keyboard has no case to switch, so the seven letters take that
                room back rather than leaving a hole at the start of the row. */}
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

            {/* The space bar, which here is what commits the word. A guess ends on the key
                the thumb is already resting on, at the size and in the place a space bar
                has on every other keyboard — so the one press that finishes a word is the
                one press nobody has to aim. */}
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
            // Typing is the one place in the app where a touch is worth feeling, so this is
            // the lightest tap the phone has — twenty-six keys' worth of anything stronger
            // would be a massage.
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
    /**
     * Written on the key, beside the glyph.
     *
     * The space bar carries the word because it is wide enough to, and because a bar
     * that size saying nothing is a bar nobody presses. Backspace sits in a letter row
     * with no room for a word and goes by its glyph, the way it does on a phone.
     */
    text?: string,
    variant: 'enter' | 'delete'
}

/**
 * Raden and Wissen. A plain `Pressable` rather than a `PopPressable`, so unlike every
 * letter beside them these two make their noise without moving — worth tidying up, but a
 * change to how the keyboard looks rather than how it sounds, so not made here.
 */
function ActionKey({ icon, label, flex, height, disabled, onPress, text, variant }: ActionKeyProps) {
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
            /*
             * Stretched to its parent rather than `width: '100%'`, which is not the same
             * thing the moment a caller reaches out past the page's gutter with a negative
             * margin — and this one does.
             *
             * A percentage width is measured against the parent's content box and then
             * fixed there, so the negative margins no longer widen the box: the left one
             * slides it out over the gutter and the right one has nothing left to do, which
             * piles the whole gutter up on the right-hand side. Stretching has no width of
             * its own to fix, so both margins pull, and the keyboard ends up as wide as the
             * two of them make it — square with the screen on both edges.
             */
            alignSelf: 'stretch',
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
        // The glyph and the word side by side, so a bar six keys wide is not a lone icon
        // floating in the middle of it.
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
