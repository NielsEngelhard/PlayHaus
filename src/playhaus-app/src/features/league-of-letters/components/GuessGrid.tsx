import type { GameGuess, Mark } from "@/api/calls/league-of-letters";
import AppText from "@/components/text/AppText";
import { FontSizes, Spacing } from "@/constants/theme";
import { markStyles, type MarkStyle } from "@/features/league-of-letters/marks";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, LayoutChangeEvent, Platform, StyleProp, View, ViewStyle } from "react-native";

interface Props {
    wordLength: number,
    maxGuesses: number,
    /**
     * The rows on the board, oldest first, already scored by the server.
     *
     * In solo these are all yours. On a multiplayer board they belong to whoever
     * played them — the six rows are the table's, not one player's.
     */
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
const MAX_TILE = 58;

/** A letter dropping into an empty slot. Short enough to keep up with fast typing. */
const FILL_MS = 160;
/** Half a turn: down to the edge, then back up on the other side. */
const FLIP_MS = 110;
/** A whole turn — how long after its mark arrives a tile is done animating. */
const SETTLED_AFTER_MS = FLIP_MS * 2;
/** Gap between one tile starting to turn over and the next. */
const REVEAL_STEP_MS = 200;

/** Up, and back down onto the board. */
const HOP_UP_MS = 190;
const HOP_DOWN_MS = 380;
/** Gap between one tile hopping and the next, which is what makes it a wave. */
const HOP_STEP_MS = 55;

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
    return Math.max(0, wordLength - 1) * REVEAL_STEP_MS + SETTLED_AFTER_MS;
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
    const styles = useStyles();

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
    const styles = useStyles();

    // A row the clock filled in. It has no word and no marks, so there is nothing to
    // reveal and nothing to colour — it is a turn that went by, drawn as one.
    const skipped = guess?.skipped === true;

    const word = skipped ? '' : (guess?.word ?? draft).toUpperCase();
    const { revealed, live } = useReveal(skipped ? undefined : guess?.word, wordLength);

    // The row that won it, once the last tile is face up. Only for a word that landed
    // while the row was watching: coming back to a finished game should not throw a
    // party over a result the player already knows.
    const winning = guess !== undefined
        && guess.marks.length === wordLength
        && guess.marks.every(mark => mark === 'correct');
    const celebrate = winning && live && revealed >= wordLength;

    return (
        <View style={[styles.row, { gap: GAP }]}>
            {Array.from({ length: wordLength }, (_, column) => (
                <LetterTile
                    key={column}
                    letter={word[column] ?? ''}
                    // Held back until this tile's turn comes round. Until then it is
                    // indistinguishable from the letter the player typed a moment ago.
                    mark={skipped ? undefined : column < revealed ? guess?.marks[column] : undefined}
                    size={size}
                    celebrate={celebrate}
                    column={column}
                    spent={skipped}
                />
            ))}
        </View>
    )
}

/**
 * How many of this row's marks are face up yet, and whether the row watched them land.
 *
 * A word that was already on the board when the row mounted is shown whole: coming back
 * to a game in progress should not replay every turn of it. Only a word that lands while
 * the row is watching gets dealt out a tile at a time — `live` is that distinction, which
 * the celebration needs for the same reason the reveal does.
 */
function useReveal(word: string | undefined, wordLength: number): { revealed: number, live: boolean } {
    const [dealt, setDealt] = useState(word);
    const [revealed, setRevealed] = useState(word ? wordLength : 0);
    const [live, setLive] = useState(false);

    // Adjusted during render rather than in an effect, so a scored row never gets painted
    // face up for a frame before the reveal takes it back. A word going missing is the next
    // round starting, which puts the row back to an empty draft.
    if (dealt !== word) {
        setDealt(word);
        setRevealed(word ? 1 : 0);
        setLive(word !== undefined);
    }

    useEffect(() => {
        if (word === undefined || revealed >= wordLength) return;

        const next = setTimeout(() => setRevealed(count => count + 1), REVEAL_STEP_MS);
        return () => clearTimeout(next);
    }, [word, revealed, wordLength]);

    return { revealed, live };
}

interface LetterTileProps {
    letter: string,
    /** Absent while the guess is still being typed — the server has not scored it yet. */
    mark?: Mark,
    size: number,
    /** This tile is part of the row that won the round, and its turn is done. */
    celebrate?: boolean,
    /** Where in the row it sits, which is its place in the wave. */
    column: number,
    /** Part of a row nobody played: the turn ran out. Drawn struck through rather than empty. */
    spent?: boolean
}

function LetterTile({ letter, mark, size, celebrate = false, column, spent = false }: LetterTileProps) {
    const theme = useTheme();
    const styles = useStyles();

    const filled = letter !== '';

    /**
     * The face trails the prop by half a turn: the tile has to be edge-on before it can
     * come back a different colour, or the answer is readable through the flip. Held as
     * the style rather than the mark because it is always a beat behind what the mark says.
     */
    const marks = markStyles(theme);

    const [face, setFace] = useState<MarkStyle | undefined>(mark && marks[mark]);

    // Built once by the lazy initialiser — a fresh value on every render would drop a tile
    // mid-flip. A tile that mounts already filled or already scored starts settled, which
    // is what keeps a reloaded board from animating itself in.
    const [landing] = useState(() => new Animated.Value(filled ? 1 : 0));
    const [turn] = useState(() => new Animated.Value(1));
    /** 0 on the board, 1 at the top of the hop. */
    const [hop] = useState(() => new Animated.Value(0));

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
            setFace(undefined);
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
        // The face goes on at the turn, while the tile is edge-on and there is nothing
        // to see: swapping it in the open would hand the mark over early.
        const swap = setTimeout(() => setFace(marks[mark]), FLIP_MS);

        flip.start();
        return () => {
            clearTimeout(swap);
            flip.stop();
        };
        // `theme.scheme` rather than `marks`: that is rebuilt on every render, and depending
        // on it would restart the flip mid-turn. The scheme is what actually changes what a
        // face looks like.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mark, turn, theme.scheme]);

    useEffect(() => {
        if (!celebrate) return;

        const dance = Animated.sequence([
            // The last tile is still finishing its turn when the row is declared won, and
            // one that jumped mid-flip would land before its own colour did.
            Animated.delay(SETTLED_AFTER_MS + column * HOP_STEP_MS),
            Animated.timing(hop, {
                toValue: 1,
                duration: HOP_UP_MS,
                easing: Easing.out(Easing.quad),
                useNativeDriver
            }),
            Animated.timing(hop, {
                toValue: 0,
                duration: HOP_DOWN_MS,
                // Settles with a knock rather than easing down, which is the same note the
                // letters arrive on.
                easing: Easing.bounce,
                useNativeDriver
            })
        ]);

        dance.start();
        return () => {
            dance.stop();
            hop.setValue(0);
        };
    }, [celebrate, column, hop]);

    return (
        <Animated.View
            style={[
                styles.tile,
                {
                    width: size,
                    height: size,
                    // Scales with the tile so a 26dp tile doesn't end up a lozenge, and
                    // lands on the design's 16 at the full 58.
                    borderRadius: Math.min(16, Math.round(size * 0.28)),
                    transform: [
                        // Scaled with the tile so the wave is the same shape on a phone as
                        // it is on a tablet.
                        { translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.3] }) },
                        { scale: hop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
                        { scale: filled ? landing.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) : 1 },
                        // Never quite zero: a tile with no height at all blinks out of
                        // existence on web instead of turning edge-on.
                        { scaleY: turn.interpolate({ inputRange: [0, 1], outputRange: [0.04, 1] }) }
                    ]
                },
                face
                    // A scored tile takes the mark's own outline, which in dark is the
                    // mark's colour — there is no ink there to frame it with.
                    ? [{ backgroundColor: face.fill, borderColor: face.border }, styles.tileScored]
                    // A turn that ran out. Drawn broken rather than blank so it reads as
                    // a row that was spent, not one still waiting to be played.
                    : spent
                        ? styles.tileSpent
                        // A typed-but-unsubmitted letter stands up off the page; an empty
                        // slot sits back, the same way `WordLengthInput` separates chosen
                        // from not.
                        : letter
                            ? styles.tileFilled
                            : styles.tileEmpty
            ]}
        >
            <AppText
                style={[
                    styles.letter,
                    {
                        fontSize: Math.max(FontSizes.md, Math.min(27, Math.round(size * 0.47))),
                        color: face?.foreground ?? theme.colors.text
                    }
                ]}
            >
                {letter}
            </AppText>
        </Animated.View>
    )
}

const useStyles = createThemedStyles(theme => ({
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
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border
    },
    // Only light lifts a scored tile. Dark says the same thing with the mark's colour,
    // and a shadow under every tile on a dark board reads as grime rather than depth.
    tileScored: theme.scheme === 'dark'
        ? {}
        : { boxShadow: '2px 2px 0 0 #0F0D12, 0 8px 14px -10px rgba(15, 13, 18, 0.6)' },
    tileFilled: {
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : theme.colors.border,
        backgroundColor: theme.scheme === 'dark'
            ? theme.colors.backgroundFocus
            : theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark' ? {} : { boxShadow: '2px 2px 0 0 #0F0D12' })
    },
    tileEmpty: {
        borderColor: theme.colors.boardEmptyBorder,
        backgroundColor: theme.colors.boardEmpty
    },
    // A row the clock filled in: no fill, no shadow, a broken outline. The same
    // vocabulary `LobbyPlayerGrid` uses for a seat nobody has taken, because it means
    // the same thing -- a place that stayed empty.
    tileSpent: {
        backgroundColor: 'transparent',
        borderStyle: 'dashed',
        opacity: 0.45
    },
    letter: {
        fontWeight: 900,
        // Outfit Black is wide; without pulling it in, a full tile touches its own border.
        letterSpacing: -0.5
    }
}))
