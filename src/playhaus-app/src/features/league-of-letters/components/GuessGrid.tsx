import type { GameGuess, Mark } from "@/api/calls/league-of-letters";
import AppText from "@/components/text/AppText";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import { MARK_STYLES } from "@/features/league-of-letters/marks";
import { useState } from "react";
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

interface Props {
    wordLength: number,
    maxGuesses: number,
    /** This player's guesses only, oldest first, already scored by the server. */
    guesses: GameGuess[],
    /** The row being typed. Empty once the round is decided. */
    draft: string,
    /** For layout only — how the grid sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
}

const GAP = Spacing.two;

/**
 * A tile any smaller than this stops being readable; any larger and a three-letter game
 * on a tablet turns into four enormous slabs. Between them the grid simply fits.
 */
const MIN_TILE = 26;
const MAX_TILE = 64;

/**
 * The largest tile that fits the board on both axes at once.
 *
 * Width alone is not enough: the grid is up to six rows tall and the keyboard underneath
 * is not negotiable, so a tall board on a short phone has to size down off its height.
 * Measured from the container rather than the window, which keeps it right on web at any
 * browser size and inside the 600px content cap.
 */
function fittedTileSize(width: number, height: number, columns: number, rows: number): number {
    if (width <= 0 || height <= 0) return 0;

    const byWidth = (width - GAP * (columns - 1)) / columns;
    const byHeight = (height - GAP * (rows - 1)) / rows;

    return Math.max(MIN_TILE, Math.min(MAX_TILE, Math.floor(Math.min(byWidth, byHeight))));
}

/** The board: one row per guess you get, one tile per letter of the word. */
export default function GuessGrid({ wordLength, maxGuesses, guesses, draft, style }: Props) {
    const [box, setBox] = useState({ width: 0, height: 0 });

    const size = fittedTileSize(box.width, box.height, wordLength, maxGuesses);

    function measure(event: LayoutChangeEvent) {
        const { width, height } = event.nativeEvent.layout;
        setBox(current => (current.width === width && current.height === height ? current : { width, height }));
    }

    return (
        <View style={[styles.board, style]} onLayout={measure}>
            {/* Nothing to draw until the first layout pass has said how much room there is. */}
            {size > 0 && (
                <View style={styles.grid}>
                    {Array.from({ length: maxGuesses }, (_, row) => (
                        <GuessRow
                            key={row}
                            wordLength={wordLength}
                            size={size}
                            guess={guesses[row]}
                            // Exactly one row is being typed: the first one with no guess in it.
                            draft={row === guesses.length ? draft : ''}
                        />
                    ))}
                </View>
            )}
        </View>
    )
}

interface GuessRowProps {
    wordLength: number,
    size: number,
    guess?: GameGuess,
    draft: string
}

function GuessRow({ wordLength, size, guess, draft }: GuessRowProps) {
    const word = (guess?.word ?? draft).toUpperCase();

    return (
        <View style={[styles.row, { gap: GAP }]}>
            {Array.from({ length: wordLength }, (_, column) => (
                <LetterTile
                    key={column}
                    letter={word[column] ?? ''}
                    mark={guess?.marks[column]}
                    size={size}
                />
            ))}
        </View>
    )
}

interface LetterTileProps {
    letter: string,
    /** Absent while the guess is still being typed — the server has not scored it yet. */
    mark?: Mark,
    size: number
}

function LetterTile({ letter, mark, size }: LetterTileProps) {
    const marked = mark ? MARK_STYLES[mark] : undefined;

    return (
        <View
            style={[
                styles.tile,
                {
                    width: size,
                    height: size,
                    // Scales with the tile so a 26dp tile doesn't end up a lozenge.
                    borderRadius: Math.min(14, Math.round(size * 0.28))
                },
                marked
                    ? [{ backgroundColor: marked.fill }, Shadows.hardLarge]
                    // A typed-but-unsubmitted letter stands up off the page; an empty slot
                    // sits back, the same way `WordLengthCard` separates chosen from not.
                    : letter
                        ? [styles.tileFilled, Shadows.hardLarge]
                        : styles.tileEmpty
            ]}
        >
            <AppText
                style={[
                    styles.letter,
                    {
                        fontSize: Math.max(FontSizes.md, Math.min(FontSizes.xxl, Math.round(size * 0.5))),
                        color: marked?.foreground ?? Colors.light.text
                    }
                ]}
            >
                {letter}
            </AppText>
        </View>
    )
}

const styles = StyleSheet.create({
    board: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%'
    },
    grid: {
        gap: GAP
    },
    row: {
        flexDirection: 'row'
    },
    tile: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.light.border
    },
    tileFilled: {
        backgroundColor: Colors.light.backgroundSecondary
    },
    tileEmpty: {
        backgroundColor: Colors.light.backgroundInput,
        opacity: 0.8,
        ...Shadows.hardSmall
    },
    letter: {
        fontWeight: 900,
        // Outfit Black is wide; without pulling it in, a full tile touches its own border.
        letterSpacing: -0.5
    }
})
