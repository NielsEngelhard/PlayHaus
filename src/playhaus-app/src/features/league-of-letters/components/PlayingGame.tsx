import type { Game } from "@/api/calls/league-of-letters";
import AppText from "@/components/text/AppText";
import BackButton from "@/components/ui/BackButton";
import InlineNotification from "@/components/ui/InlineNotification";
import { ROUTES } from "@/constants/routes";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import GameTimer from "@/features/league-of-letters/components/GameTimer";
import GuessGrid from "@/features/league-of-letters/components/GuessGrid";
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
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    /**
     * Wrapped in an object rather than held as a bare string so that saying the same
     * thing twice is still a new notice: two `'Te kort.'`s in a row are equal as strings,
     * which would leave the first one's dismissal timer running and blink the second away.
     */
    const [notice, setNotice] = useState<{ text: string } | null>(null);

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
    // the stale letters never get painted once.
    const round = `${game.id}:${game.round?.number ?? 0}`;
    const [drafted, setDrafted] = useState(round);
    if (drafted !== round) {
        setDrafted(round);
        setDraft('');
        setNotice(null);
    }

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
        setDraft(current => current.slice(0, -1));
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
            setDraft('');
        } catch (failure) {
            setNotice({ text: guessErrorMessage(failure) });
        } finally {
            setSending(false);
        }
    }

    return (
        <View style={styles.screen}>
            <View style={styles.topRow}>
                {/* The bottom bar is hidden while a game is on screen, so this is the way out. */}
                <BackButton href={ROUTES.leagueOfLettersIndex} />

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

            {finished ? (
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
                marks={keyboardMarks(myGuesses, userId)}
                onKey={type}
                onEnter={submit}
                onBackspace={backspace}
                // Locked while a guess is in flight: the response replaces the whole
                // board, so a second word typed over the top of it would land on rows
                // that are about to be renumbered.
                disabled={finished || sending}
            />
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
