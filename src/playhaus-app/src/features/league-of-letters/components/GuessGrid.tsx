import type { GameGuess, Mark } from "@/api/calls/league-of-letters";
import AppText from "@/components/text/AppText";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import { MARK_STYLES } from "@/features/league-of-letters/marks";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, LayoutChangeEvent, Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

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

/** A letter dropping into an empty slot. Short enough to keep up with fast typing. */
const FILL_MS = 160;
/** Half a turn: down to the edge, then back up on the other side. */
const FLIP_MS = 110;
/** Gap between one tile starting to turn over and the next. */
const REVEAL_STEP_MS = 200;

// react-native-web has no native animation module, so asking for one there is a
// console warning and nothing else. Transforms are driver-safe everywhere else.
const useNativeDriver = Platform.OS !== 'web';

/**
 * How long a freshly scored row takes to finish turning over.
 *
 * Exported because the reveal is a moment the rest of the screen has to respect: the
 * keyboard colours and the end-of-round line would otherwise give away the last tiles
 * while they are still face down. The timing lives here, with the animation it belongs to.
 */
export function revealDurationMs(wordLength: number): number {
    return Math.max(0, wordLength - 1) * REVEAL_STEP_MS + FLIP_MS * 2;
}

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
    const revealed = useReveal(guess?.word, wordLength);

    return (
        <View style={[styles.row, { gap: GAP }]}>
            {Array.from({ length: wordLength }, (_, column) => (
                <LetterTile
                    key={column}
                    letter={word[column] ?? ''}
                    // Held back until this tile's turn comes round. Until then it is
                    // indistinguishable from the letter the player typed a moment ago.
                    mark={column < revealed ? guess?.marks[column] : undefined}
                    size={size}
                />
            ))}
        </View>
    )
}

/**
 * How many of this row's marks are face up yet.
 *
 * A word that was already on the board when the row mounted is shown whole: coming back
 * to a game in progress should not replay every turn of it. Only a word that lands while
 * the row is watching gets dealt out a tile at a time.
 */
function useReveal(word: string | undefined, wordLength: number): number {
    const [dealt, setDealt] = useState(word);
    const [revealed, setRevealed] = useState(word ? wordLength : 0);

    // Adjusted during render rather than in an effect, so a scored row never gets painted
    // face up for a frame before the reveal takes it back. A word going missing is the next
    // round starting, which puts the row back to an empty draft.
    if (dealt !== word) {
        setDealt(word);
        setRevealed(word ? 1 : 0);
    }

    useEffect(() => {
        if (word === undefined || revealed >= wordLength) return;

        const next = setTimeout(() => setRevealed(count => count + 1), REVEAL_STEP_MS);
        return () => clearTimeout(next);
    }, [word, revealed, wordLength]);

    return revealed;
}

interface LetterTileProps {
    letter: string,
    /** Absent while the guess is still being typed — the server has not scored it yet. */
    mark?: Mark,
    size: number
}

function LetterTile({ letter, mark, size }: LetterTileProps) {
    const filled = letter !== '';

    /**
     * The colour trails the prop by half a turn. The tile has to be edge-on before it can
     * come back a different colour, or the answer is readable through the flip.
     */
    const [shownMark, setShownMark] = useState(mark);
    const marked = shownMark ? MARK_STYLES[shownMark] : undefined;

    // Built once by the lazy initialiser — a fresh value on every render would drop a tile
    // mid-flip. A tile that mounts already filled or already scored starts settled, which
    // is what keeps a reloaded board from animating itself in.
    const [landing] = useState(() => new Animated.Value(filled ? 1 : 0));
    const [turn] = useState(() => new Animated.Value(1));

    const wasFilled = useRef(filled);
    const wasMarked = useRef(mark);

    useEffect(() => {
        if (wasFilled.current === filled) return;
        wasFilled.current = filled;

        // Backspaced: nothing to play, just be ready for the next letter to land.
        if (!filled) {
            landing.setValue(0);
            return;
        }

        landing.setValue(0);
        const drop = Animated.timing(landing, {
            toValue: 1,
            duration: FILL_MS,
            // Overshoots a hair past full size on the way in, so the letter arrives with
            // a knock rather than growing into place.
            easing: Easing.out(Easing.back(2)),
            useNativeDriver
        });

        drop.start();
        return () => drop.stop();
    }, [filled, landing]);

    useEffect(() => {
        if (wasMarked.current === mark) return;
        wasMarked.current = mark;

        // The round moved on and took the marks with it. No turn to play backwards.
        if (mark === undefined) {
            setShownMark(undefined);
            turn.setValue(1);
            return;
        }

        const flip = Animated.sequence([
            Animated.timing(turn, {
                toValue: 0,
                duration: FLIP_MS,
                easing: Easing.in(Easing.quad),
                useNativeDriver
            }),
            Animated.timing(turn, {
                toValue: 1,
                duration: FLIP_MS,
                easing: Easing.out(Easing.quad),
                useNativeDriver
            })
        ]);
        // Swapped at the turn, while there is no face to see.
        const swap = setTimeout(() => setShownMark(mark), FLIP_MS);

        flip.start();
        return () => {
            clearTimeout(swap);
            flip.stop();
        };
    }, [mark, turn]);

    return (
        <Animated.View
            style={[
                styles.tile,
                {
                    width: size,
                    height: size,
                    // Scales with the tile so a 26dp tile doesn't end up a lozenge.
                    borderRadius: Math.min(14, Math.round(size * 0.28)),
                    transform: [
                        { scale: filled ? landing.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) : 1 },
                        // Never quite zero: a tile with no height at all blinks out of
                        // existence on web instead of turning edge-on.
                        { scaleY: turn.interpolate({ inputRange: [0, 1], outputRange: [0.04, 1] }) }
                    ]
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
        </Animated.View>
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
