import type { Game, GameRound } from "@/api/calls/league-of-letters";
import MusicToggle from "@/components/layout/MusicToggle";
import ThemeToggle from "@/components/layout/ThemeToggle";
import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import Confetti from "@/components/ui/Confetti";
import InGameHeader, { type SegmentState } from "@/components/ui/InGameHeader";
import SlideFadeIn from "@/components/ui/SlideFadeIn";
import { ROUTES } from "@/constants/routes";
import { Brand, Spacing } from "@/constants/theme";
import { useMusic } from "@/features/audio/MusicContext";
import { usePhrase, useT } from "@/features/i18n/LanguageContext";
import type { Phrase } from "@/features/i18n/keys";
import GameTimer from "@/features/league-of-letters/components/GameTimer";
import GuessGrid, { revealDurationMs } from "@/features/league-of-letters/components/GuessGrid";
import LetterKeyboard from "@/features/league-of-letters/components/LetterKeyboard";
import NextRoundCountdown from "@/features/league-of-letters/components/NextRoundCountdown";
import PlayerScoreRow from "@/features/league-of-letters/components/PlayerScoreRow";
import RoundChip from "@/features/league-of-letters/components/RoundChip";
import RoundResultCard from "@/features/league-of-letters/components/RoundResultCard";
import SoloStatusRow from "@/features/league-of-letters/components/SoloStatusRow";
import { guessErrorMessage } from "@/features/league-of-letters/game-errors";
import { keyboardMarks } from "@/features/league-of-letters/marks";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
     * Solo only: who is playing, for the status row above the board.
     *
     * Handed in rather than read off the session here, the same way `userId` is — the
     * board is given who it is drawing for and does not go looking. Multiplayer has no
     * use for it: `game.players` already names everybody at the table, this player
     * included.
     */
    player?: { name: string, avatarColorId: string },
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
    player,
    onGuess,
    myTurn,
    onTyping,
    online,
    onNextRound,
    onFinish
}: Props) {
    const styles = useStyles();
    const t = useT();
    const phrase = usePhrase();

    const router = useRouter();

    /*
     * How much of the bottom of the screen belongs to the phone rather than to the game.
     *
     * The keyboard used to clear it by a flat 32, which on an iPhone is 34dp of home
     * indicator and 6dp of clearance — the exact thing the constant was chosen to avoid,
     * and dead space on every Android and browser that has no indicator at all. The
     * device knows the number; `InGameHeader` already asks it for the notch.
     */
    const insets = useSafeAreaInsets();

    // Something with a pulse, rather than the loop a room waits on. Claimed by the board
    // rather than by a route, because the multiplayer room serves the lobby and the board
    // off the same href — and claiming it here covers solo and multiplayer in the one
    // place they agree.
    useMusic('playing');

    /**
     * The letter the round opens with. Given away rather than guessed: the server sends
     * it alongside the round, so it is the one thing about the answer the app is allowed
     * to know while the round is still winnable.
     *
     * Uppercased once here, which is the case the board, the keyboard and the draft all
     * work in.
     *
     * Shown as a hint and never typed for anybody: the row opens empty, and the letter
     * is put down by the player like every other one. Handing it to them costs the one
     * press it saves and takes the first tile away from them — a board that types back
     * is a board they have to work around, on a keyboard whose backspace then refuses
     * the tile they are looking at.
     */
    const firstLetter = round.firstLetter.toUpperCase();

    /** Empty until the player types. The hint is theirs to put down, not ours. */
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    /**
     * The catalogue key of the line, wrapped in an object rather than held bare so that
     * saying the same thing twice is still a new notice: two identical keys in a row are
     * equal as strings, which would leave the first one's dismissal timer running and
     * blink the second away.
     */
    const [notice, setNotice] = useState<Phrase | null>(null);
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

    // A turn that ends unsubmitted does not carry its draft into the next one — otherwise
    // whatever was left standing in the row reappears next time the turn comes back
    // around. Cleared the moment the turn is no longer yours rather than when it becomes
    // yours again, so nobody else's screen is shown a draft that is already stale.
    // Adjusted during render, the same way `boardKey` is, so it is never painted.
    const [couldPlay, setCouldPlay] = useState(canPlay);
    if (canPlay !== couldPlay) {
        setCouldPlay(canPlay);
        if (!canPlay) setDraft('');
    }

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
    // the stale letters never get painted once. The hint is part of the key because a
    // word typed under the old one can no longer be the answer: a changed opening letter
    // makes whatever is standing in the row wrong in the one way the round refuses.
    const boardKey = `${game.id}:${round.roundNumber}:${firstLetter}`;
    const [drafted, setDrafted] = useState(boardKey);
    const newBoard = drafted !== boardKey;
    if (newBoard) {
        setDrafted(boardKey);
        setDraft('');
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
        // Every letter in the row was typed by the player, the opening one included, so
        // every letter comes back out again. Nothing here is held back from them.
        setDraft(current => {
            const next = current.slice(0, -1);
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

        // The hint is a rule as well as a hint: the server refuses a word that opens on
        // anything else. Answered here rather than sent off, because the board already
        // knows the letter — and a 400 comes back as "ongeldig woord", which blames the
        // word for what is really a mistyped first tile. Named in full, so the line says
        // which letter it means without the player looking back up at the chip.
        if (!draft.startsWith(firstLetter)) {
            setNotice({ key: 'lol.game.mustStartWith', values: { letter: firstLetter } });
            return;
        }

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
            setDraft('');
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

    const outcome = decided ? (won ? 'won' : 'lost') : 'playing';

    /*
     * One segment per round, and the one you are on only turns green when it is won —
     * which is why the track is worth having over a plain "2 of 3": it carries how the
     * game has actually gone, not just how far in you are.
     *
     * Only the round on screen carries its own verdict. The rounds behind it are drawn as
     * played rather than as won or lost, because that is the one fact `round` is handed
     * about them; `game.rounds` knows the rest and nothing asks it yet.
     */
    const segments: SegmentState[] = Array.from({ length: game.totalRounds }, (_, index) =>
        index < round.roundNumber - 1 ? 'played'
            : index > round.roundNumber - 1 ? 'upcoming'
                : outcome === 'playing' ? 'played' : outcome
    );

    return (
        <View style={styles.screen}>
            {/* Everything about the round itself: the way out, where you are in the game,
                and the hint — which becomes the round's verdict once it has one. The app
                header sits above this and stays out of the round's business. */}
            <InGameHeader
                onClose={() => router.replace(ROUTES.leagueOfLettersIndex)}
                closeLabel={t('common.back')}
                label={t('lol.game.roundOf', { round: round.roundNumber, total: game.totalRounds })}
                segments={segments}
                /*
                 * The two switches the app's header carries everywhere else. A board has
                 * claimed the chrome — see `useChromeless` — and these are the two of its
                 * controls a player actually reaches for mid-game: the music is loud in a
                 * room full of people, and the lights go down in the same room. Losing
                 * them for the length of a game meant leaving the game to get them back.
                 *
                 * Only these two. The pill and the wordmark are about where you are, and
                 * the band already says that better than they would.
                 */
                actions={
                    <>
                        <MusicToggle variant='band' />
                        <ThemeToggle variant='band' />
                    </>
                }
            >
                <RoundChip
                    outcome={outcome}
                    firstLetter={firstLetter}
                    tries={myGuesses.length}
                />
            </InGameHeader>

            {/* Untimed rounds carry no deadline, so there is nothing to count down. */}
            {multiplayer && round.endsAt && !finished && (
                <GameTimer endsAt={round.endsAt} style={styles.timer} />
            )}

            {/* Solo's answer to the row of chips below: you, your running total, and how
                long you have been at it. The clock stops when the game does, so what is
                left standing over the last verdict is how long the game took. */}
            {!multiplayer && player !== undefined && (
                <SoloStatusRow
                    name={player.name}
                    avatarColorId={player.avatarColorId}
                    score={game.score}
                    startedAt={game.createdAt}
                    running={!gameOver}
                />
            )}

            {multiplayer && game.players && (
                <PlayerScoreRow
                    players={game.players}
                    userId={userId}
                    online={online}
                    turnUserId={game.turn?.userId}
                />
            )}


            {/* A lane of its own, held open whether or not there is anything in it. The
                grid sizes itself to whatever room it is left, so a line that came and
                went would resize every tile on the board twice per nudge. Takes no
                touches, so nothing underneath it stops working. */}
            <View style={styles.noticeLane} pointerEvents='none'>
                {!verdict && notice && (
                    <View style={styles.notice}>
                        <AppText style={styles.noticeText}>{phrase(notice)}</AppText>
                    </View>
                )}
            </View>            

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
                    draft={finished ? '' : canPlay ? draft : ''}
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
                style={[styles.controls, { marginBottom: Math.max(Spacing.two, insets.bottom) + Spacing.two }]}
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
                        style={styles.keyboard}
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
    // Fills the window, which is what keeps the keyboard on the bottom edge and the board
    // off the fold. No top padding of its own: the band above it is the top of the screen,
    // and the board is short enough on height already.
    //
    // The sides are here rather than on the page because a chromeless page is handed the
    // window bare — see `useChromeless`. The band reaches back out through them; see the
    // negative margin in `InGameHeader`.
    screen: {
        flex: 1,
        width: '100%',
        gap: Spacing.three - 4,
        paddingHorizontal: Spacing.four,
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
        ...theme.shadows.hardSmall
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
    //
    // The gap underneath is set at the call site, from the device's own bottom inset: the
    // bottom row of a keyboard this close to the edge of the phone is where the home
    // indicator and the browser's own chrome live, and a thumb reaching past them to find
    // Wissen is a thumb that sometimes leaves the app instead.
    controls: {
        flexShrink: 0
    },
    // The board's gutters are generous on purpose, but a keyboard is not page content —
    // it is the one control on the screen a thumb aims at twenty-six times a round, and
    // every dp it hands back to the margin comes straight off the width of a key. So it
    // takes the whole gutter back and runs edge to edge, the way a phone's own keyboard
    // does: exactly `screen`'s own horizontal padding, cancelled.
    //
    // A negative margin rather than `InGameHeader`'s `getReach`, which is the other way
    // out of this column: that one paints past the parent, which Android is free to clip,
    // and a clipped key is a key that stops answering. Cancelling the padding stops at
    // the parent's own edge, so every key is still live on every platform.
    keyboard: {
        marginHorizontal: -Spacing.three
    }
}))
