import type { Game } from "@/api/calls/league-of-letters";
import AppText from "@/components/text/AppText";
import BackButton from "@/components/ui/BackButton";
import InlineNotification from "@/components/ui/InlineNotification";
import { ROUTES } from "@/constants/routes";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import GameTimer from "@/features/league-of-letters/components/GameTimer";
import GuessGrid, { revealDurationMs } from "@/features/league-of-letters/components/GuessGrid";
import LetterKeyboard from "@/features/league-of-letters/components/LetterKeyboard";
import PlayerScoreRow from "@/features/league-of-letters/components/PlayerScoreRow";
import { guessErrorMessage } from "@/features/league-of-letters/game-errors";
import { keyboardMarks } from "@/features/league-of-letters/marks";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

interface Props {
    game: Game,
    /** Whose board this is. Matched against `GameGuess.userId`. */
    userId: string,
    /**
     * Sends a complete word. Rejecting is how a refusal is reported — whatever it
     * throws is turned into a line for the player by `guessErrorMessage`.
     *
     * Left out on a board that cannot be played, which is how the multiplayer room
     * still renders while it has no endpoint to send to.
     */
    onGuess?: (word: string) => Promise<void>
}

/** How long a nudge like "Te kort." stays up before it stops being useful. */
const NOTICE_MS = 2500;

/**
 * A game being played: the board, the keyboard, and — for multiplayer — a clock and the
 * other players.
 *
 * The two modes are one component rather than two because they differ only in what sits
 * above the board. Everything that makes the screen a game is identical, and a solo game
 * is really a multiplayer one with nobody else in it and no deadline.
 */
export default function PlayingGame({ game, userId, onGuess }: Props) {
    /**
     * The letter the round opens with. Given away rather than guessed: the server sends
     * it alongside the round, so it is the one thing about the answer the app is allowed
     * to know while the round is still winnable.
     *
     * Uppercased once here, which is the case the board, the keyboard and the draft all
     * work in. Empty on a board with no round behind it — the mock multiplayer ones — and
     * everything below then behaves exactly as it did before there was a hint.
     */
    const firstLetter = game.round?.firstLetter?.toUpperCase() ?? '';

    /** Never empty: every row starts with the hint already down in its first tile. */
    const [draft, setDraft] = useState(firstLetter);
    const [sending, setSending] = useState(false);
    /**
     * Wrapped in an object rather than held as a bare string so that saying the same
     * thing twice is still a new notice: two `'Te kort.'`s in a row are equal as strings,
     * which would leave the first one's dismissal timer running and blink the second away.
     */
    const [notice, setNotice] = useState<{ text: string } | null>(null);
    /**
     * The board is still turning its last row over. Nothing that knows the answer may be
     * shown while it is, or the keyboard and the end-of-round line spoil the tiles that
     * have not been dealt yet.
     */
    const [revealing, setRevealing] = useState(false);
    /** Bumped per guess, so a word sent while the board is mid-reveal restarts the wait
     * instead of inheriting the tail of the previous one's. */
    const [revealed, setRevealed] = useState(0);

    const multiplayer = game.mode === 'multiplayer';
    const guesses = game.round?.guesses ?? [];
    const myGuesses = guesses.filter(guess => guess.userId === userId);

    // The backend withholds the answer while the round is still winnable, so being told it
    // at all is what tells us the round is over. No separate flag needed.
    const answer = game.round?.word;
    const finished = game.status === 'finished' || answer !== undefined;
    const won = myGuesses.some(guess => guess.marks.every(mark => mark === 'correct'));

    // A new board is a new draft — otherwise moving to the next round leaves half a word
    // behind in a row that now belongs to a different puzzle. Adjusted during render, so
    // the stale letters never get painted once. The hint is part of the key because it is
    // part of the draft: a new opening letter has to replace the one already typed in.
    const round = `${game.id}:${game.round?.number ?? 0}:${firstLetter}`;
    const [drafted, setDrafted] = useState(round);
    if (drafted !== round) {
        setDrafted(round);
        setDraft(firstLetter);
        setNotice(null);
        setRevealing(false);
    }

    useEffect(() => {
        if (!revealing) return;

        const done = setTimeout(() => setRevealing(false), revealDurationMs(game.wordLength));
        return () => clearTimeout(done);
        // `revealed` is in here to restart the clock on a guess that lands mid-reveal.
    }, [revealing, revealed, game.wordLength]);

    useEffect(() => {
        if (notice === null) return;

        const clear = setTimeout(() => setNotice(null), NOTICE_MS);
        return () => clearTimeout(clear);
    }, [notice]);

    function type(letter: string) {
        setNotice(null);
        setDraft(current => (current.length < game.wordLength ? current + letter : current));
    }

    function backspace() {
        setNotice(null);
        // The hint is not the player's to delete. Wiping the row and having to put the
        // same letter back by hand is busywork, and a row that starts with anything else
        // is a word that cannot be the answer.
        setDraft(current => (current.length > firstLetter.length ? current.slice(0, -1) : current));
    }

    async function submit() {
        if (sending) return;

        if (onGuess === undefined) {
            setNotice({ text: 'Raden kan zodra de server dit ondersteunt.' });
            return;
        }

        if (draft.length < game.wordLength) {
            setNotice({ text: 'Te kort.' });
            return;
        }

        // Checked here as well as on the server. The board already knows every word
        // this player has tried, so a repeat can be answered in Dutch and instantly
        // rather than being sent off to come back as an English 409.
        if (myGuesses.some(guess => guess.word.toUpperCase() === draft)) {
            setNotice({ text: 'Die had je al.' });
            return;
        }

        setSending(true);
        try {
            await onGuess(draft);
            // Cleared only on success: a guess the server refused is still the word
            // the player meant, and retyping it would be a punishment for a hiccup.
            // Cleared back to the hint, not to nothing — the next row opens the same way.
            setDraft(firstLetter);
            setRevealing(true);
            setRevealed(count => count + 1);
        } catch (failure) {
            setNotice({ text: guessErrorMessage(failure) });
        } finally {
            setSending(false);
        }
    }

    return (
        <View style={styles.screen}>
            <View style={styles.topRow}>

                {/* First letter */}
                {firstLetter !== '' && (
                    <View
                        style={styles.hint}
                        accessibilityRole='text'
                        accessibilityLabel={`Hint: het woord begint met de ${firstLetter}`}
                    >
                        <AppText style={styles.hintLetter}>{firstLetter}</AppText>
                    </View>
                )}

                {/* Untimed rounds carry no deadline, so there is nothing to count down. */}
                {multiplayer && game.round?.endsAt && (
                    <GameTimer endsAt={game.round.endsAt} style={styles.timer} />
                )}
            </View>

            {multiplayer && (
                <PlayerScoreRow players={game.players} userId={userId} />
            )}

            <GuessGrid
                wordLength={game.wordLength}
                maxGuesses={game.maxGuesses}
                guesses={myGuesses}
                // The row being typed only exists while the round can still be won.
                draft={finished ? '' : draft}
            />

            {/* The verdict waits for the board: being told you won while the last two
                tiles are still face down reads the result out before the reveal does. */}
            {finished && !revealing ? (
                <InlineNotification
                    icon={won ? 'check' : 'x'}
                    color={won ? Colors.light.mint : Colors.light.blush}
                    title={won ? 'Gevonden' : 'Helaas'}
                    message={answer
                        ? `Het woord was ${answer.toUpperCase()}.`
                        : 'Deze ronde zit erop.'}
                />
            ) : notice && (
                <View style={styles.notice}>
                    <AppText style={styles.noticeText}>{notice.text}</AppText>
                </View>
            )}

            <LetterKeyboard
                // The newest guess is left out until the board has finished showing it —
                // the keys would otherwise colour in before the tiles they belong to.
                marks={keyboardMarks(revealing ? myGuesses.slice(0, -1) : myGuesses, userId)}
                onKey={type}
                onEnter={submit}
                onBackspace={backspace}
                // Locked while a guess is in flight: the response replaces the whole
                // board, so a second word typed over the top of it would land on rows
                // that are about to be renumbered.
                disabled={finished || sending}
            />

            <BackButton href={ROUTES.leagueOfLettersIndex} />
        </View>
    )
}

const styles = StyleSheet.create({
    // Fills the height the root layout leaves under `Header`, which is what keeps the
    // keyboard on the bottom edge and the board off the fold.
    screen: {
        flex: 1,
        width: '100%',
        gap: Spacing.three,
        paddingBottom: Spacing.two
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three
    },
    hint: {
        flexDirection: 'row',
        alignItems: 'center',
        // Holds its size against the timer, which is the flexible one in this row.
        flexShrink: 0,
        gap: Spacing.two,
        borderWidth: 2,
        borderColor: Colors.light.border,
        borderRadius: 11,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.two,
        backgroundColor: Colors.light.backgroundSecondary,
        ...Shadows.hardSmall
    },
    hintLabel: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        color: Colors.light.text
    },
    hintLetter: {
        fontSize: FontSizes.md,
        fontWeight: 900,
        // Matches the board's tiles: Outfit Black is wide enough to need pulling in.
        letterSpacing: -0.5,
        color: Colors.light.text
    },
    timer: {
        flex: 1,
        justifyContent: 'flex-end'
    },
    notice: {
        alignSelf: 'center',
        borderWidth: 2,
        borderColor: Colors.light.border,
        borderRadius: 999,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.three,
        backgroundColor: Colors.light.lemon,
        ...Shadows.hardSmall
    },
    noticeText: {
        fontSize: FontSizes.sm,
        fontWeight: 700,
        color: Colors.light.text
    }
})
