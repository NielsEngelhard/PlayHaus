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
import PlayerScoreRow from "@/components/ui/PlayerScoreRow";
import RoundChip from "@/features/league-of-letters/components/RoundChip";
import RoundResultCard from "@/features/league-of-letters/components/RoundResultCard";
import ScoreChip from "@/features/league-of-letters/components/ScoreChip";
import SoloStatusRow from "@/features/league-of-letters/components/SoloStatusRow";
import WordLengthChip from "@/features/league-of-letters/components/WordLengthChip";
import { guessErrorMessage } from "@/features/league-of-letters/game-errors";
import { keyboardMarks } from "@/features/league-of-letters/marks";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { playYourTurn } from "@/utils/your-turn-sound";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MetaDataRow from "./MetaDataRow";

interface Props {
    game: Game,
    // The round on screen.
    round: GameRound,
    /** Whose board this is. Matched against `GameGuess.userId`. */
    userId: string,
    // Solo only: who is playing, for the status row above the board.
    player?: { name: string, avatarColorId: string },
    // Sends a complete word.
    onGuess?: (word: string) => Promise<void>,
    // Multiplayer only.
    myTurn?: boolean,
    // Multiplayer only.
    onTyping?: (letters: string) => void,
    // Multiplayer only.
    typing?: string | null,
    // Multiplayer only.
    online?: Set<string>,
    // Moves on from a finished round.
    onNextRound?: () => void,
    // Leaves a game that has no rounds left.
    onFinish?: () => void
}

/** How long a nudge like "Die had je al." stays up before it stops being useful. */
const NOTICE_MS = 2500;

// How long the nudge takes to slide and fade in or out.
const NOTICE_FADE_MS = 140;

// react-native-web has no native animation module, so asking for one there is a console warning and nothing else.
const useNativeDriver = Platform.OS !== 'web';

// How far the toast travels on its way in.
const NOTICE_SLIDE_PX = 30;

// How a new round arrives: the board and the controls under it lift into place.
const RISE_MS = 260;
// How far they lift.
const RISE_PX = 14;
// The controls follow the board rather than moving with it.
const RISE_STAGGER_MS = 60;

// How long a shared board sits on the answer before it moves itself on.
const NEXT_ROUND_MS = 3500;

// A game being played: the board, the keyboard, and — for multiplayer — a clock and the other players.
export default function PlayingGame({
    game,
    round,
    userId,
    player,
    onGuess,
    myTurn,
    onTyping,
    typing,
    online,
    onNextRound,
    onFinish
}: Props) {
    const styles = useStyles();
    const theme = useTheme();
    const t = useT();
    const phrase = usePhrase();

    const router = useRouter();

    // How much of the bottom of the screen belongs to the phone rather than to the game.
    const insets = useSafeAreaInsets();

    // Something with a pulse, rather than the loop a room waits on.
    useMusic('playing');

    // The letter the round opens with.
    const firstLetter = round.firstLetter.toUpperCase();

    /** Empty until the player types. The hint is theirs to put down, not ours. */
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    // The catalogue key of the line, wrapped in an object rather than held bare so that saying the same thing twice is still a new notice.
    const [notice, setNotice] = useState<Phrase | null>(null);
    // What the pill actually renders, a beat behind `notice` clearing.
    const [shownNotice, setShownNotice] = useState<Phrase | null>(null);
    if (notice !== null && shownNotice !== notice) {
        setShownNotice(notice);
    }
    const [noticeOpacity] = useState(() => new Animated.Value(0));
    // The board is still turning its last row over.
    const [revealing, setRevealing] = useState(false);
    // Bumped per row that lands, so a word arriving while the board is mid-reveal restarts the wait instead of inheriting the tail of the previous one's.
    const [revealed, setRevealed] = useState(0);

    const multiplayer = game.mode === 'multiplayer';

    // The rows on the board.
    const rows = multiplayer ? round.guesses : round.guesses.filter(guess => guess.userId === userId);

    /** Yours specifically, which is still what a win and the duplicate check are about. */
    const myGuesses = round.guesses.filter(guess => guess.userId === userId);

    /** On a shared board the keyboard is only live when the turn is yours. */
    const canPlay = !multiplayer || myTurn === true;

    // A turn that ends unsubmitted does not carry its draft into the next one.
    const [couldPlay, setCouldPlay] = useState(canPlay);
    if (canPlay !== couldPlay) {
        setCouldPlay(canPlay);
        if (!canPlay) setDraft('');
    }

    // The turn arriving gets a sound and a line in the notice lane, on top of the draft's own reset above.
    const wasMyTurn = useRef(canPlay);
    useEffect(() => {
        if (multiplayer && canPlay && !wasMyTurn.current) {
            playYourTurn();
            setNotice({ key: 'lol.game.yourTurnNotice' });
        }
        wasMyTurn.current = canPlay;
    }, [multiplayer, canPlay]);

    // The backend withholds the answer while the round is still winnable.
    const answer = round.word;
    const finished = answer !== undefined;
    const won = myGuesses.some(guess => guess.marks.every(mark => mark === 'correct'));
    /** The last round's verdict is the game's, and there is nowhere to go on to. */
    const gameOver = finished && round.roundNumber >= game.totalRounds;
    // A win that happened here, just now.
    const celebrating = finished && won && !revealing && revealed > 0;
    // The round is lost and the board has finished saying so.
    const verdict = finished && !revealing && !won;
    // The round is over *and* the board has stopped talking about it.
    const decided = finished && !revealing;

    // A new board is a new draft — otherwise moving to the next round leaves half a word behind in a row that now belongs to a different puzzle.
    const boardKey = `${game.id}:${round.roundNumber}:${firstLetter}`;
    const [drafted, setDrafted] = useState('');
    const newBoard = drafted !== boardKey;
    if (newBoard) {
        setDrafted(boardKey);
        // The round's opening letter goes down on the first row for whoever plays it.
        setDraft(canPlay && rows.length === 0 ? firstLetter : '');
        setNotice(null);
        setRevealing(false);
    }

    // The newest row on the board — the one that may still be turning over.
    const newest = rows[rows.length - 1];
    const [dealt, setDealt] = useState(newest?.id);
    if (dealt !== newest?.id) {
        setDealt(newest?.id);
        // A new round arrives with rows this screen never watched land, and a row the clock filled in has no marks to turn over.
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

    // Fades the pill to match: in when a new notice arrives, out when it is cleared.
    useEffect(() => {
        if (notice !== null) {
            const fadeIn = Animated.timing(noticeOpacity, {
                toValue: 1,
                duration: NOTICE_FADE_MS,
                useNativeDriver
            });
            fadeIn.start();
            return () => fadeIn.stop();
        }

        const fadeOut = Animated.timing(noticeOpacity, {
            toValue: 0,
            duration: NOTICE_FADE_MS,
            useNativeDriver
        });
        fadeOut.start(({ finished }) => finished && setShownNotice(null));
        return () => fadeOut.stop();
    }, [notice, noticeOpacity]);

    // On a shared board the round moves itself on.
    const movingOn = multiplayer && decided && !gameOver && onNextRound !== undefined;

    useEffect(() => {
        if (!movingOn) return;

        const move = setTimeout(() => onNextRound?.(), NEXT_ROUND_MS);
        return () => clearTimeout(move);
    }, [movingOn, onNextRound]);

    // And the last round moves on to the uitslag, by the same clock.
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
            // Relayed from here rather than from an effect on `draft`.
            if (next !== current) onTyping?.(next);
            return next;
        });
    }

    function backspace() {
        setNotice(null);
        // Every letter in the row was typed by the player, the opening one included, so every letter comes back out again.
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

        // Silently refused.
        if (draft.length < game.wordLength) return;

        // The hint is a rule as well as a hint: the server refuses a word that opens on anything else.
        if (!draft.startsWith(firstLetter)) {
            setNotice({ key: 'lol.game.mustStartWith', values: { letter: firstLetter } });
            return;
        }

        // Checked here as well as on the server.
        const played = rows.find(guess => !guess.skipped && guess.word.toUpperCase() === draft);
        if (played !== undefined) {
            setNotice({ key: played.userId === userId ? 'lol.game.alreadyGuessedYou' : 'lol.game.alreadyGuessed' });
            return;
        }

        setSending(true);
        try {
            await onGuess(draft);
            // Cleared only on success: a guess the server refused is still the word the player meant.
            setDraft('');
            // And the table stops seeing the word that has now landed as a row.
            onTyping?.('');
            // The reveal is not started here.
        } catch (failure) {
            setNotice({ key: guessErrorMessage(failure) });
        } finally {
            setSending(false);
        }
    }

    const outcome = decided ? (won ? 'won' : 'lost') : 'playing';

    // One segment per round, and the one you are on only turns green when it is won — which is why the track is worth having over a plain "2 of 3".
    const segments: SegmentState[] = Array.from({ length: game.totalRounds }, (_, index) =>
        index < round.roundNumber - 1 ? 'played'
            : index > round.roundNumber - 1 ? 'upcoming'
                : outcome === 'playing' ? 'played' : outcome
    );

    return (
        <View style={styles.screen}>
            {/* The way out, where you are in the game, and the app's two standing switches. */}
            <InGameHeader
                onClose={() => router.replace(ROUTES.leagueOfLettersIndex)}
                closeLabel={t('common.back')}
                label={t('lol.game.roundOf', { round: round.roundNumber, total: game.totalRounds })}
                segments={segments}
                // The two switches the app's header carries everywhere else.
                actions={
                    <>
                        <MusicToggle variant='band' />
                        <ThemeToggle variant='band' />
                    </>
                }
            />

            {/* Everything the notice can afford to drop in on top of: the round's own stats, the roster, and the board. */}
            <View style={styles.stage}>
                <MetaDataRow
                    game={game}
                    outcome={outcome}
                    firstLetter={firstLetter}
                    finished={finished}
                    multiplayer={multiplayer}
                    myGuesses={myGuesses}
                    round={round}
                />

                {/* Solo's answer to the row of chips below: you, your running total, and how long you have been at it. A zen game keeps neither. */}
                {!multiplayer && player !== undefined && (
                    <SoloStatusRow
                        name={player.name}
                        avatarColorId={player.avatarColorId}
                        score={game.competitive ? game.score : undefined}
                        startedAt={game.competitive ? game.createdAt : undefined}
                        running={!gameOver}
                        daily={game.mode === 'daily'}
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

                {/* Keyed on the round number, which is what replays the lift. */}
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
                        // The row being typed only exists while the round can still be won, and on a shared board it belongs to whoever is up.
                        draft={finished ? '' : canPlay ? draft : (typing ?? '')}
                    />
                </SlideFadeIn>

                {/* A toast, not a reserved lane: the old version held a fixed strip of the column open at all times so a nudge had. */}
                <View style={styles.noticeLane} pointerEvents='none'>
                    {!verdict && shownNotice && (
                        <Animated.View
                            style={[
                                styles.notice,
                                {
                                    opacity: noticeOpacity,
                                    // One value doing both jobs: sliding in is arriving.
                                    transform: [{
                                        translateY: noticeOpacity.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [-NOTICE_SLIDE_PX, 0]
                                        })
                                    }]
                                }
                            ]}
                        >
                            <AppText style={styles.noticeText}>{phrase(shownNotice)}</AppText>
                        </Animated.View>
                    )}
                </View>
            </View>

            {/* The keyboard stays mounted through the verdict rather than being swapped out for it. */}
            <SlideFadeIn
                key={`controls-${round.roundNumber}`}
                offsetY={RISE_PX}
                durationMs={RISE_MS}
                delayMs={RISE_STAGGER_MS}
                style={[styles.controls, { marginBottom: Math.max(Spacing.two, insets.bottom) + Spacing.two }]}
            >
                <LetterKeyboard
                    // On a shared board the keys show what the *table* has learned.
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

                {decided && (
                    // `box-none` on the popover's own frame so a touch that lands on the scrim but off the card still has somewhere to go.
                    <View style={styles.popover} pointerEvents='box-none'>
                        <View
                            style={[styles.popoverBlur, { backgroundColor: theme.colors.background + 'CC' }]}
                            pointerEvents='none'
                        />

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
                                    // The result is where a finished game goes when there is one to go to.
                                    text={onFinish === undefined ? t('common.backToGames') : t('lol.game.viewResult')}
                                    size='large'
                                    onPress={() => onFinish === undefined
                                        ? router.replace(ROUTES.leagueOfLettersIndex)
                                        : onFinish()}
                                />
                            ) : movingOn ? (
                                // No button on a shared board: the table moves on by itself, and all that is left to say is how long the word stays up.
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
                    </View>
                )}
            </SlideFadeIn>

            {/* Last, so it falls in front of everything. */}
            <Confetti active={celebrating} />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    screen: {
        flex: 1,
        width: '100%',
        gap: Spacing.three - 4,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.two
    },
    timer: {
        flexShrink: 0
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two
    },
    // Wraps the metadata row, the roster, and the board — see the comment at the call site.
    stage: {
        flex: 1,
        width: '100%',
        gap: Spacing.three - 4
    },
    board: {
        flex: 1,
        width: '100%'
    },
    // Absolute rather than in flow, so it costs `stage` nothing when there is no notice up.
    noticeLane: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 5,
        elevation: 5
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
    outcome: {
        flexShrink: 0,
        gap: Spacing.three - 4
    },
    // Wraps the keyboard and, once the round is decided, the popover laid over it, so the two of them lift in as one.
    controls: {
        flexShrink: 0,
        position: 'relative'
    },
    // The verdict's frame, sized to the keyboard underneath it rather than to its own content.
    popover: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: -Spacing.three,
        right: -Spacing.three,
        alignItems: 'stretch',
        justifyContent: 'center',
        paddingHorizontal: Spacing.three
    },
    popoverBlur: {
        ...StyleSheet.absoluteFill
    },
    // The board's gutters are generous on purpose, but a keyboard is not page content.
    keyboard: {
        marginHorizontal: -Spacing.three
    }
}))
