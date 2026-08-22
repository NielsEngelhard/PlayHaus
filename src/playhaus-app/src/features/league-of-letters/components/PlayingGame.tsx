import type { Game, GameRound } from "@/api/calls/league-of-letters";
import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import Confetti from "@/components/ui/Confetti";
import SlideFadeIn from "@/components/ui/SlideFadeIn";
import { ROUTES } from "@/constants/routes";
import { Brand, Spacing } from "@/constants/theme";
import { useGameMusic } from "@/features/audio/MusicContext";
import GameTimer from "@/features/league-of-letters/components/GameTimer";
import GuessGrid, { revealDurationMs } from "@/features/league-of-letters/components/GuessGrid";
import LetterKeyboard from "@/features/league-of-letters/components/LetterKeyboard";
import NextRoundCountdown from "@/features/league-of-letters/components/NextRoundCountdown";
import PlayerScoreRow from "@/features/league-of-letters/components/PlayerScoreRow";
import RoundBar from "@/features/league-of-letters/components/RoundBar";
import RoundResultCard from "@/features/league-of-letters/components/RoundResultCard";
import { guessErrorMessage } from "@/features/league-of-letters/game-errors";
import { keyboardMarks } from "@/features/league-of-letters/marks";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useT } from "@/features/i18n/LanguageContext";
import type { TranslationKey } from "@/features/i18n/keys";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

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
     * anyone afterwards, which falls back to the way out of the game entirely.
     *
     * On a shared board this is called by the clock rather than by a press, so it has to
     * be stable for the same reason `onNextRound` does.
     */
    onFinish?: () => void
}

/** How long a nudge like "Die had je al." stays up before it stops being useful. */
const NOTICE_MS = 2500;

/**
 * The room kept free for a nudge, whether or not there is one up.
 *
 * Tall enough for the pill and no taller. Stated as a height rather than left to the
 * pill, because the point of the lane is that it is the same size when it is empty.
 */
const NOTICE_LANE_HEIGHT = 30;

/**
 * How a new round arrives: the board and the controls under it lift into place.
 *
 * Rising rather than sliding sideways, which is the app's movement for going somewhere
 * else. A new round is not a new page — it is the same board with the next puzzle on
 * it — so it gets an axis of its own, and the round bar above stays put to say so.
 */
const RISE_MS = 260;
/**
 * How far they lift. Small, because the board is the largest thing on the screen and a
 * surface that size travelling any real distance reads as a lurch rather than a lift.
 */
const RISE_PX = 14;
/**
 * The controls follow the board rather than moving with it. Just enough to be read as
 * one gesture settling in order, instead of the whole screen blinking at once.
 */
const RISE_STAGGER_MS = 60;

/**
 * How long a shared board sits on the answer before it moves itself on.
 *
 * Long enough to read a word and take in whether anybody got it, short enough that four
 * people are not left waiting on the fifth to look up from their phone. Counted from the
 * end of the reveal rather than from the end of the round, so the word is up for all of it.
 */
const NEXT_ROUND_MS = 3500;

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
    const styles = useStyles();
    const t = useT();

    const router = useRouter();

    // The one screen in the app that is not a menu, so the one screen that swaps the zen
    // loop out for something with a pulse. Claimed by the board rather than by a route,
    // because the multiplayer room serves the lobby and the board off the same href —
    // and claiming it here covers solo and multiplayer in the one place they agree.
    useGameMusic('action');

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
     * The catalogue key of the line, wrapped in an object rather than held bare so that
     * saying the same thing twice is still a new notice: two identical keys in a row are
     * equal as strings, which would leave the first one's dismissal timer running and
     * blink the second away.
     */
    const [notice, setNotice] = useState<{ key: TranslationKey } | null>(null);
    /**
     * The board is still turning its last row over. Nothing that knows the answer may be
     * shown while it is, or the keyboard and the end-of-round line spoil the tiles that
     * have not been dealt yet.
     */
    const [revealing, setRevealing] = useState(false);
    /** Bumped per row that lands, so a word arriving while the board is mid-reveal
     * restarts the wait instead of inheriting the tail of the previous one's. */
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
    /**
     * The round is over *and* the board has stopped talking about it. Everything that
     * would spoil the reveal — the verdict, the result panel, the way on — waits for this
     * rather than for `finished` alone.
     */
    const decided = finished && !revealing;

    // A new board is a new draft — otherwise moving to the next round leaves half a word
    // behind in a row that now belongs to a different puzzle. Adjusted during render, so
    // the stale letters never get painted once. The hint is part of the key because it is
    // part of the draft: a new opening letter has to replace the one already typed in.
    const boardKey = `${game.id}:${round.roundNumber}:${firstLetter}`;
    const [drafted, setDrafted] = useState(boardKey);
    const newBoard = drafted !== boardKey;
    if (newBoard) {
        setDrafted(boardKey);
        setDraft(firstLetter);
        setNotice(null);
        setRevealing(false);
    }

    /**
     * The newest row on the board — the one that may still be turning over.
     *
     * A row landing is what starts the reveal, whoever played it. On a shared board
     * everybody is watching the same tiles turn, so the answer has to wait them out on
     * every screen and not only on the screen of whoever typed the word: otherwise the
     * rest of the table reads the result off a card while their own board is still face
     * down. Adjusted during render, so nothing that knows the answer is painted for a
     * frame before the reveal takes it back.
     */
    const newest = rows[rows.length - 1];
    const [dealt, setDealt] = useState(newest?.id);
    if (dealt !== newest?.id) {
        setDealt(newest?.id);
        // A new round arrives with rows this screen never watched land, and a row the
        // clock filled in has no marks to turn over. Neither of them is a reveal.
        if (!newBoard && newest !== undefined && !newest.skipped) {
            setRevealing(true);
            setRevealed(count => count + 1);
        }
    }

    /** How long to sit on the answer: as long as the board takes to turn the row over. */
    const revealWait = revealDurationMs(game.wordLength);

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

    /**
     * On a shared board the round moves itself on.
     *
     * Nobody presses Volgende ronde in multiplayer: five people each waiting for the
     * other four is a game that pauses between every round, and one of them putting their
     * phone in a pocket is a game that stops for good. So the answer gets its beat and
     * the whole table goes on together — timed from the end of the reveal, which is the
     * same moment on every screen because it is the same row scored the same way.
     *
     * `onNextRound` is stable, which is what makes this one wait rather than a wait that
     * starts again every time the room delivers a frame.
     */
    const movingOn = multiplayer && decided && !gameOver && onNextRound !== undefined;

    useEffect(() => {
        if (!movingOn) return;

        const move = setTimeout(() => onNextRound?.(), NEXT_ROUND_MS);
        return () => clearTimeout(move);
    }, [movingOn, onNextRound]);

    /**
     * And the last round moves on to the uitslag, by the same clock.
     *
     * The end of the game is where the table most has to arrive together: the result is
     * the screen the host opens the next room from, and anybody who never pressed
     * through to it is somebody the room cannot carry along. So the final verdict gets
     * the same beat as every other one and then takes everybody with it.
     */
    const finishing = multiplayer && decided && gameOver && onFinish !== undefined;

    useEffect(() => {
        if (!finishing) return;

        const finish = setTimeout(() => onFinish?.(), NEXT_ROUND_MS);
        return () => clearTimeout(finish);
    }, [finishing, onFinish]);

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
            setNotice({ key: 'lol.game.guessUnsupported' });
            return;
        }

        // Silently refused. A half-typed row is not a mistake worth interrupting anyone
        // over — the empty tiles already say the word is not finished, and a line of text
        // repeating that is noise on every stray press of the guess key.
        if (draft.length < game.wordLength) return;

        // Checked here as well as on the server. The board already knows every word
        // that has been tried, so a repeat can be answered instantly, and in the
        // player's own language, rather than being sent off to come back as a 409.
        //
        // Against the whole board on multiplayer: on a shared grid somebody else
        // having tried a word is exactly as much of a repeat as you having tried it,
        // and the answer is a different sentence.
        const played = rows.find(guess => !guess.skipped && guess.word.toUpperCase() === draft);
        if (played !== undefined) {
            setNotice({ key: played.userId === userId ? 'lol.game.alreadyGuessedYou' : 'lol.game.alreadyGuessed' });
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
            // The reveal is not started here. The row this guess just put on the board is
            // what starts it, on this screen by the same rule as on everybody else's.
        } catch (failure) {
            setNotice({ key: guessErrorMessage(failure) });
        } finally {
            setSending(false);
        }
    }

    return (
        <View style={styles.screen}>
            {/* Everything about the round itself: the way out, where you are in the game,
                and the hint — which becomes the round's verdict once it has one. The app
                header sits above this and stays out of the round's business. */}
            <RoundBar
                round={round.roundNumber}
                total={game.totalRounds}
                outcome={decided ? (won ? 'won' : 'lost') : 'playing'}
                firstLetter={firstLetter}
                tries={myGuesses.length}
                onLeave={() => router.replace(ROUTES.leagueOfLettersIndex)}
            />

            {/* A lane of its own, held open whether or not there is anything in it. The
                grid sizes itself to whatever room it is left, so a line that came and
                went would resize every tile on the board twice per nudge. Takes no
                touches, so nothing underneath it stops working. */}
            <View style={styles.noticeLane} pointerEvents='none'>
                {!verdict && notice && (
                    <View style={styles.notice}>
                        <AppText style={styles.noticeText}>{t(notice.key)}</AppText>
                    </View>
                )}
            </View>

            {/* Untimed rounds carry no deadline, so there is nothing to count down. */}
            {multiplayer && round.endsAt && !finished && (
                <GameTimer endsAt={round.endsAt} style={styles.timer} />
            )}

            {multiplayer && game.players && (
                <PlayerScoreRow
                    players={game.players}
                    userId={userId}
                    online={online}
                    turnUserId={game.turn?.userId}
                    typingUserId={typing === null || typing === undefined ? undefined : game.turn?.userId}
                />
            )}

            {/* Keyed on the round number, which is what replays the lift: a new round is
                a new board, and remounting it is what clears the last one's tiles as
                well as what starts the animation. Not `boardKey` — that also carries
                the hint letter, and a changed hint is not a new round.

                Prefixed because the controls below rise on the same round number: two
                siblings under one parent sharing a key is a key collision, and React
                answers it by matching the second element to the first one's fiber —
                the board drawn twice, and the keyboard nowhere. */}
            <SlideFadeIn
                key={`board-${round.roundNumber}`}
                offsetY={RISE_PX}
                durationMs={RISE_MS}
                style={styles.board}
            >
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
                />
            </SlideFadeIn>

            {/* The keyboard until there is nothing left to type, then the verdict in the
                same place. Swapped rather than stacked: a dead keyboard under a result is
                a control that looks broken, and the room it takes is exactly the room the
                result needs. Both wait out the reveal — a panel naming the word while the
                last tiles are still face down reads the answer out early. */}
            <SlideFadeIn
                key={`controls-${round.roundNumber}`}
                offsetY={RISE_PX}
                durationMs={RISE_MS}
                delayMs={RISE_STAGGER_MS}
                style={styles.controls}
            >
                {decided ? (
                    <View style={styles.outcome}>
                        <RoundResultCard
                            word={answer ?? ''}
                            tries={round.guesses.length}
                            maxGuesses={game.maxGuesses}
                            won={won}
                        />

                        {finishing ? (
                            <NextRoundCountdown durationMs={NEXT_ROUND_MS} label={t('lol.game.resultLabel')} />
                        ) : gameOver ? (
                            <ActionButton
                                // The result is where a finished game goes when there is one
                                // to go to. A board without it has only the way out to offer.
                                text={onFinish === undefined ? t('common.backToGames') : t('lol.game.viewResult')}
                                size='large'
                                onPress={() => onFinish === undefined
                                    ? router.replace(ROUTES.leagueOfLettersIndex)
                                    : onFinish()}
                            />
                        ) : movingOn ? (
                            /* No button on a shared board: the table moves on by itself,
                               and all that is left to say is how long the word stays up. */
                            <NextRoundCountdown durationMs={NEXT_ROUND_MS} />
                        ) : (
                            <ActionButton
                                text={t('lol.game.nextRound')}
                                size='large'
                                onPress={() => onNextRound?.()}
                                disabled={onNextRound === undefined}
                            />
                        )}
                    </View>
                ) : (
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
            </SlideFadeIn>

            {/* Last, so it falls in front of everything. It takes no room and no touches,
                so the board underneath keeps its size and the buttons keep working while
                the paper comes down. */}
            <Confetti active={celebrating} />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // Fills the room the header leaves, which is what keeps the keyboard on the bottom
    // edge and the board off the fold. No top padding of its own: the header above ends in
    // enough slack to stand as the gap, and the board is short enough on height already.
    screen: {
        flex: 1,
        width: '100%',
        gap: Spacing.three - 4,
        paddingBottom: Spacing.two
    },
    timer: {
        flexShrink: 0,
        justifyContent: 'flex-end'
    },
    // All the room left over once everything around it has been laid out, which is what
    // the grid measures itself against.
    board: {
        flex: 1,
        width: '100%'
    },
    // Fixed height rather than a minimum: a message long enough to wrap should spill into
    // the gap around the lane, not push the board down and shrink every tile.
    noticeLane: {
        flexShrink: 0,
        height: NOTICE_LANE_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center'
    },
    notice: {
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.lemon : theme.colors.border,
        borderRadius: 999,
        paddingVertical: 5,
        paddingHorizontal: 14,
        backgroundColor: theme.colors.lemon,
        ...(theme.scheme === 'dark' ? {} : { boxShadow: '2px 2px 0 0 #0F0D12' })
    },
    noticeText: {
        fontSize: 13,
        fontWeight: 800,
        color: Brand.ink
    },
    // Stands where the keyboard was, and is spaced like it: the result and the way on
    // are one block, not two things that happen to be near each other.
    outcome: {
        flexShrink: 0,
        gap: Spacing.three - 4
    },
    // Wraps whichever of the keyboard and the result is up, so the two of them lift in
    // as one. Holds its size for the same reason they do: the board above is the only
    // thing on this screen that gives room away.
    controls: {
        flexShrink: 0
    }
}))
