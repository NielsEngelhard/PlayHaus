import type { Game, GameGuess, GameRound } from "@/api/calls/league-of-letters";
import AppText from "@/components/text/AppText";
import BackButton from "@/components/ui/BackButton";
import Confetti from "@/components/ui/Confetti";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import GameTimer from "@/features/league-of-letters/components/GameTimer";
import GuessGrid, { revealDurationMs } from "@/features/league-of-letters/components/GuessGrid";
import LetterKeyboard from "@/features/league-of-letters/components/LetterKeyboard";
import PlayerScoreRow from "@/features/league-of-letters/components/PlayerScoreRow";
import RoundCounter from "@/features/league-of-letters/components/RoundCounter";
import { guessErrorMessage } from "@/features/league-of-letters/game-errors";
import { keyboardMarks } from "@/features/league-of-letters/marks";
import { avatarColorById } from "@/features/settings/profile";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

interface Props {
    game: Game,
    /**
     * The round on screen. Not always the one the game is on: a round that has just
     * ended stays up until the player moves off it, so the verdict is not swapped
     * out from under them.
     */
    round: GameRound,
    /** Whose board this is. Matched against `GameGuess.userId`. */
    userId: string,
    /**
     * Sends a complete word. Rejecting is how a refusal is reported — whatever it
     * throws is turned into a line for the player by `guessErrorMessage`.
     *
     * Left out on a board that cannot be played.
     */
    onGuess?: (word: string) => Promise<void>,
    /**
     * Multiplayer only. Whether the keyboard belongs to this player right now: on a
     * shared board only one person may add a row at a time.
     *
     * Left undefined on solo, where the board is always yours.
     */
    myTurn?: boolean,
    /**
     * Multiplayer only. What the player whose turn it is has typed so far, shown in
     * the row they are typing it into so the table can watch them think. Never your
     * own letters — those are already on screen as `draft`.
     */
    typing?: string | null,
    /**
     * Multiplayer only. Relays this player's draft to the rest of the table. Called
     * on every keystroke; the throttling is the caller's.
     */
    onTyping?: (letters: string) => void,
    /**
     * Multiplayer only. Who is connected, for the scoreboard's live dots. On a
     * turn-based board this is the difference between waiting on somebody who is
     * looking at the screen and waiting on somebody whose phone locked.
     */
    online?: Set<string>,
    /**
     * Moves on from a finished round. Left out when there is nowhere to move on to,
     * which is what makes the last round's verdict the end of the game.
     */
    onNextRound?: () => void,
    /**
     * Leaves a game that has no rounds left. Left out on a board with nowhere to send
     * anyone afterwards — the mocked multiplayer room — which falls back to the way
     * out of the game entirely.
     */
    onFinish?: () => void
}

/** How long a nudge like "Die had je al." stays up before it stops being useful. */
const NOTICE_MS = 2500;

/**
 * A game being played: the board, the keyboard, and — for multiplayer — a clock and the
 * other players.
 *
 * The two modes are one component rather than two because they differ only in what sits
 * above the board. Everything that makes the screen a game is identical, and a solo game
 * is really a multiplayer one with nobody else in it and no deadline.
 */
export default function PlayingGame({
    game,
    round,
    userId,
    onGuess,
    myTurn,
    typing,
    onTyping,
    online,
    onNextRound,
    onFinish
}: Props) {
    const router = useRouter();

    /**
     * The letter the round opens with. Given away rather than guessed: the server sends
     * it alongside the round, so it is the one thing about the answer the app is allowed
     * to know while the round is still winnable.
     *
     * Uppercased once here, which is the case the board, the keyboard and the draft all
     * work in.
     */
    const firstLetter = round.firstLetter.toUpperCase();

    /** Never empty: every row starts with the hint already down in its first tile. */
    const [draft, setDraft] = useState(firstLetter);
    const [sending, setSending] = useState(false);
    /**
     * Wrapped in an object rather than held as a bare string so that saying the same
     * thing twice is still a new notice: two `'Die had je al.'`s in a row are equal as strings,
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

    /**
     * The rows on the board.
     *
     * In solo they are yours and only yours — the filter is really a guard, since
     * nobody else can play into a solo game. On a multiplayer board the six rows
     * belong to the table: everyone plays into the same grid, in turn, and drawing
     * only your own would leave five of them looking blank to five different people.
     */
    const rows = multiplayer ? round.guesses : round.guesses.filter(guess => guess.userId === userId);

    /** Yours specifically, which is still what a win and the duplicate check are about. */
    const myGuesses = round.guesses.filter(guess => guess.userId === userId);

    /** On a shared board the keyboard is only live when the turn is yours. */
    const canPlay = !multiplayer || myTurn === true;

    /** The swatch of whoever played a row, so a shared board says whose is whose. */
    const colorOf = useCallback((guess: GameGuess) => (
        avatarColorById(
            game.players?.find(player => player.userId === guess.userId)?.avatarColorId ?? ''
        ).color
    ), [game.players]);

    /** Who the board is waiting on, when it is not you. */
    const waitingOn = canPlay ? undefined : game.players?.find(player => player.userId === game.turn?.userId);

    // The backend withholds the answer while the round is still winnable, so being told it
    // at all is what tells us the round is over. No separate flag needed.
    const answer = round.word;
    const finished = answer !== undefined;
    const won = myGuesses.some(guess => guess.marks.every(mark => mark === 'correct'));
    /** The last round's verdict is the game's, and there is nowhere to go on to. */
    const gameOver = finished && round.roundNumber >= game.totalRounds;
    /**
     * A win that happened here, just now. `revealed` is what rules out a board that was
     * already won when it was opened — a reconnect should not throw paper at a result the
     * player watched land ten minutes ago — and `revealing` holds it back until the board
     * has finished turning the word over, the same way the losing line waits.
     */
    const celebrating = finished && won && !revealing && revealed > 0;
    /**
     * The round is lost and the board has finished saying so. It takes the notice's place
     * on screen: a nudge about the word you just typed is stale once the answer is out.
     */
    const verdict = finished && !revealing && !won;

    // A new board is a new draft — otherwise moving to the next round leaves half a word
    // behind in a row that now belongs to a different puzzle. Adjusted during render, so
    // the stale letters never get painted once. The hint is part of the key because it is
    // part of the draft: a new opening letter has to replace the one already typed in.
    const boardKey = `${game.id}:${round.roundNumber}:${firstLetter}`;
    const [drafted, setDrafted] = useState(boardKey);
    if (drafted !== boardKey) {
        setDrafted(boardKey);
        setDraft(firstLetter);
        setNotice(null);
        setRevealing(false);
    }

    /**
     * How long to sit on the answer. The row being turned over is the newest one, and its
     * marks are what decide whether the board is going to draw the last tile out or not —
     * a near-miss spins, and the verdict has to wait out the spin like everything else.
     */
    const revealWait = revealDurationMs(game.wordLength, myGuesses[myGuesses.length - 1]?.marks);

    useEffect(() => {
        if (!revealing) return;

        const done = setTimeout(() => setRevealing(false), revealWait);
        return () => clearTimeout(done);
        // `revealed` is in here to restart the clock on a guess that lands mid-reveal.
    }, [revealing, revealed, revealWait]);

    useEffect(() => {
        if (notice === null) return;

        const clear = setTimeout(() => setNotice(null), NOTICE_MS);
        return () => clearTimeout(clear);
    }, [notice]);

    function type(letter: string) {
        setNotice(null);
        setDraft(current => {
            const next = current.length < game.wordLength ? current + letter : current;
            // Relayed from here rather than from an effect on `draft`, so the table sees
            // the letter on the same press that put it there.
            if (next !== current) onTyping?.(next);
            return next;
        });
    }

    function backspace() {
        setNotice(null);
        // The hint is not the player's to delete. Wiping the row and having to put the
        // same letter back by hand is busywork, and a row that starts with anything else
        // is a word that cannot be the answer.
        setDraft(current => {
            const next = current.length > firstLetter.length ? current.slice(0, -1) : current;
            if (next !== current) onTyping?.(next);
            return next;
        });
    }

    async function submit() {
        if (sending) return;

        if (onGuess === undefined) {
            setNotice({ text: 'Raden kan zodra de server dit ondersteunt.' });
            return;
        }

        // Silently refused. A half-typed row is not a mistake worth interrupting anyone
        // over — the empty tiles already say the word is not finished, and a line of text
        // repeating that is noise on every stray press of Raden.
        if (draft.length < game.wordLength) return;

        // Checked here as well as on the server. The board already knows every word
        // that has been tried, so a repeat can be answered in Dutch and instantly
        // rather than being sent off to come back as an English 409.
        //
        // Against the whole board on multiplayer: on a shared grid somebody else
        // having tried a word is exactly as much of a repeat as you having tried it,
        // and the answer is a different sentence.
        const played = rows.find(guess => !guess.skipped && guess.word.toUpperCase() === draft);
        if (played !== undefined) {
            setNotice({ text: played.userId === userId ? 'Die had je al.' : 'Die is al geprobeerd.' });
            return;
        }

        setSending(true);
        try {
            await onGuess(draft);
            // Cleared only on success: a guess the server refused is still the word
            // the player meant, and retyping it would be a punishment for a hiccup.
            // Cleared back to the hint, not to nothing — the next row opens the same way.
            setDraft(firstLetter);
            // And the table stops seeing the word that has now landed as a row.
            onTyping?.('');
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
                {/* The bottom bar is hidden while a game is on screen, so this is the way
                    out. Neutral rather than the app's accent: the way out of a game is not
                    what the page is for, and the board should be the loudest thing on it. */}
                <BackButton
                    href={ROUTES.leagueOfLettersIndex}
                    variant='neutral'
                    style={styles.back}
                />

                {/* Untimed rounds carry no deadline, so there is nothing to count down. */}
                {multiplayer && round.endsAt && (
                    <GameTimer endsAt={round.endsAt} style={styles.timer} />
                )}

                {/* Which puzzle of how many. A solo game is three of them, and knowing
                    where you are in the set is the difference between "one more round"
                    and not knowing whether the game just ended. */}
                <RoundCounter
                    round={round.roundNumber}
                    total={game.totalRounds}
                    style={styles.roundCount}
                />

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
            </View>

            {multiplayer && game.players && (
                <PlayerScoreRow
                    players={game.players}
                    userId={userId}
                    online={online}
                    turnUserId={game.turn?.userId}
                    typingUserId={typing === null || typing === undefined ? undefined : game.turn?.userId}
                />
            )}

            <View style={styles.board}>
                <GuessGrid
                    wordLength={game.wordLength}
                    maxGuesses={game.maxGuesses}
                    guesses={rows}
                    /*
                     * The row being typed only exists while the round can still be won,
                     * and on a shared board it belongs to whoever is up: your own draft
                     * when that is you, and the letters relayed from their keyboard when
                     * it is not. One row, whoever is filling it.
                     */
                    draft={finished ? '' : canPlay ? draft : typing ?? ''}
                    // Solo rows are all the same player's, so a marker would be six
                    // copies of one colour.
                    ownerColorOf={multiplayer ? colorOf : undefined}
                />

                {/* Laid over the foot of the board rather than placed under it. A nudge
                    that took a line of its own would come out of the board's height, and
                    the grid sizes itself to whatever room it is left — so every notice
                    would shrink the tiles and put them back again two seconds later.
                    Takes no touches, so the keyboard keeps working underneath. */}
                {!verdict && notice && (
                    <View style={styles.noticeLayer} pointerEvents='none'>
                        <View style={styles.notice}>
                            <AppText style={styles.noticeText}>{notice.text}</AppText>
                        </View>
                    </View>
                )}
            </View>

            {/* Only the bad news gets a line. A win is already spelled out across the
                board in green, and the row's own celebration says the rest — a box
                repeating the word back is the least of the ways to be told you were right.
                The verdict waits for the board either way: being told the round is over
                while the last two tiles are still face down reads the result out before
                the reveal does. */}
            {verdict && (
                <InlineNotification
                    icon='x'
                    color={Colors.light.blush}
                    title='Helaas'
                    message={answer
                        ? `Het woord was ${answer.toUpperCase()}.`
                        : 'Deze ronde zit erop.'}
                />
            )}

            {/* The way out of a finished round. Held back until the reveal is done for
                the same reason the verdict is: a button offering the next puzzle is
                itself a spoiler while tiles are still turning over. */}
            {finished && !revealing && gameOver && (
                <InlineNotification
                    icon='flag'
                    color={Colors.light.lemon}
                    title='Klaar'
                    message={`Alle ${game.totalRounds} rondes gespeeld.`}
                />
            )}

            {/*
              * Whose turn it is, when it is not yours. The keyboard below is dead in
              * that state, and a dead keyboard with nothing saying why reads as a
              * broken one.
              */}
            {multiplayer && !finished && !canPlay && (
                <InlineNotification
                    icon='clock'
                    title={waitingOn === undefined ? 'Wachten' : `${waitingOn.name} is aan de beurt`}
                    message={typing ? 'Ze zijn aan het typen…' : 'Kijk mee — jij bent zo.'}
                />
            )}

            {(!finished || revealing) && (
                <LetterKeyboard
                    /*
                     * On a shared board the keys show what the *table* has learned:
                     * everybody is looking at the same six rows, so a letter greyed out
                     * for whoever happened to type it and nobody else would be five
                     * keyboards for one puzzle.
                     *
                     * The newest guess is left out until the board has finished showing
                     * it — the keys would otherwise colour in before the tiles they
                     * belong to.
                     */
                    marks={keyboardMarks(
                        revealing ? rows.slice(0, -1) : rows,
                        multiplayer ? undefined : userId
                    )}
                    onKey={type}
                    onEnter={submit}
                    onBackspace={backspace}
                    disabled={finished || sending || revealing || !canPlay}
                />
            )}

            {/* The way on from a decided round. Held back until the reveal has finished
                for the same reason the verdict is — a button offering the next puzzle
                announces the result while tiles are still turning over. */}
            {finished && !revealing && (
                gameOver ? (
                    <TextButton
                        // The uitslag is where a finished game goes when there is one to
                        // go to. A board without it has only the way out to offer.
                        text={onFinish === undefined ? 'Terug naar de spellen' : 'Bekijk de uitslag'}
                        fullWidth
                        onPress={() => onFinish === undefined
                            ? router.replace(ROUTES.leagueOfLettersIndex)
                            : onFinish()}
                        style={styles.advance}
                    />
                ) : (
                    <TextButton
                        text='Volgende ronde'
                        fullWidth
                        onPress={() => onNextRound?.()}
                        disabled={onNextRound === undefined}
                        style={styles.advance}
                    />
                )
            )}

            {/* Last, so it falls in front of everything. It takes no room and no touches,
                so the board underneath keeps its size and the buttons keep working while
                the paper comes down. */}
            <Confetti active={celebrating} />
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
    // Trimmed back from the margin the button stands in on pages where it is the last
    // thing on them: every point of height it takes here is a point the board loses,
    // and the board has a keyboard under it that cannot move.
    back: {
        marginVertical: Spacing.two
    },
    hint: {
        flexDirection: 'row',
        alignItems: 'center',
        // Pinned to the right-hand end of the row whether or not a clock is sharing it —
        // with no timer to take up the slack there is nothing else pushing it over.
        marginLeft: 'auto',
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
    // Takes the row's slack, which puts the counter and the hint together at the right-hand
    // end when there is no clock between them. With one, the timer has already taken it.
    roundCount: {
        marginLeft: 'auto',
        flexShrink: 0
    },
    advance: {
        backgroundColor: Colors.light.primary
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
    // Takes the room the grid used to have to itself, so the grid still measures the same
    // box whether or not there is a notice up.
    board: {
        flex: 1,
        width: '100%'
    },
    // Across the foot of the board, over the rows that have not been played yet. Pinned
    // rather than stacked: a layer with no height of its own cannot move the grid it
    // covers, which is the whole point of putting the notice here.
    noticeLayer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center'
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
