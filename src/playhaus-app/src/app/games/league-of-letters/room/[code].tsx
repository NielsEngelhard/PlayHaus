import { useFullScreen } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import BackButton from "@/components/ui/BackButton";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import LobbyView from "@/features/league-of-letters/components/LobbyView";
import MultiplayerResults from "@/features/league-of-letters/components/MultiplayerResults";
import PlayingGame from "@/features/league-of-letters/components/PlayingGame";
import RoomClosedNotice from "@/features/league-of-letters/components/RoomClosedNotice";
import { useLobby } from "@/features/league-of-letters/useLobby";
import { useMultiplayerGame, type MultiplayerGameState } from "@/features/league-of-letters/useMultiplayerGame";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { RelativePathString, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

/**
 * A room, joined by its code.
 *
 * Three screens in one, and which one you get is the room's own business: while the lobby
 * is waiting this is the lobby, the moment the host starts — which a guest finds out
 * about through the socket — it becomes the board, and when the last round is decided it
 * becomes the uitslag. The host arrives here already on the second of the three, having
 * started the game on the way over.
 *
 * The ending stays inside this screen rather than moving to a page of its own the way
 * solo's does, and that is the whole reason playing again works: the room's socket is
 * what carries everybody into the next lobby, and a result that navigated away would hang
 * up on the one connection that can deliver the new code.
 *
 * The board is owned here rather than inside `RoomGame` for the same sort of reason — it
 * outlives the board. Fetching it again for the uitslag would be a loading page between
 * the last word and the scoreboard, over a game whose every score is already on screen.
 */
export default function LeagueOfLettersRoomPage() {
    const { code } = useLocalSearchParams<{ code: string }>();
    const router = useRouter();

    const state = useLobby(code);

    const gameId = state.lobby?.status === 'started' ? state.lobby.gameId : undefined;
    const table = useMultiplayerGame(gameId, code);

    /** The board has had its last word and the room is showing the result. */
    const [finished, setFinished] = useState(false);
    // Stable: the board hangs the wait after the final verdict off this, and a callback
    // rebuilt on every frame the room delivers would restart that wait forever.
    const finish = useCallback(() => setFinished(true), []);

    // A different game under the same screen, which is exactly what playing again is:
    // the route's code changes but the screen behind it is reused, so a result left
    // standing would be the next game's board replaced by the last game's scoreboard
    // before a word had been played. Adjusted during render, so it is never painted.
    const [showing, setShowing] = useState(gameId);
    if (showing !== gameId) {
        setShowing(gameId);
        setFinished(false);
    }

    /**
     * The host opened the next room, so everybody still here goes to it — the host on the
     * strength of their own request, the guests on the announcement it made. One path,
     * because `useLobby` ends up holding the same code either way.
     *
     * `replace`, not `push`: the room that has just been played out is not somewhere the
     * back button should be able to return to.
     */
    const { rematchCode } = state;
    useEffect(() => {
        if (rematchCode === null || rematchCode === code) return;

        router.replace(ROUTES.leagueOfLettersRoom(rematchCode) as RelativePathString);
    }, [rematchCode, code, router]);

    // The host stopped the game, or shut the room out from under everybody waiting in
    // it. Checked ahead of the board, because that is where the people who need telling
    // are sitting: the board reads the same room but has no lobby of its own, so without
    // this a stopped game is a grid that quietly stops answering.
    if (state.closed) {
        return (
            <RoomClosedNotice
                message={gameId !== undefined
                    ? 'De host heeft het spel gestopt. Vraag om een nieuwe code voor een volgend potje.'
                    : 'De host heeft de kamer gesloten. Vraag om een nieuwe code.'}
            />
        )
    }

    if (gameId !== undefined) {
        return finished
            ? <RoomResults table={table} isHost={state.isHost} onPlayAgain={() => void state.rematch()} playingAgain={state.rematching} error={state.actionError} />
            : <RoomGame table={table} onFinish={finish} />;
    }

    return (
        <LobbyView
            state={state}
            // Nothing to do: this screen is already the room the game started in, and the
            // status it started with is what swaps the board in above.
            onStarted={() => { }}
        />
    )
}

interface RoomGameProps {
    table: MultiplayerGameState,
    /** Moves the room on to the uitslag once the last round has been read. */
    onFinish: () => void
}

/** The multiplayer board: the same one solo plays on, plus a clock and a scoreboard. */
function RoomGame({ table, onFinish }: RoomGameProps) {
    const theme = useTheme();
    const styles = useStyles();

    // `useFullScreen` lives here rather than on the page: a board has to fit the window
    // exactly, and neither the lobby nor the uitslag does — they are columns of cards that
    // want the ordinary scrolling page and the bottom bar. A hook cannot be called for one
    // and not the others, so the board is its own component.
    useFullScreen();

    const { user } = useAuth();

    const { game, round, online, loading, error, myTurn, typing, guess, onTyping, nextRound, gameOver, reload } = table;

    if (error !== null) {
        return (
            <View style={styles.page}>
                <BackButton href={ROUTES.leagueOfLettersIndex} />

                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title='Geen spel'
                    message={error}
                >
                    <TextButton text='Opnieuw' onPress={reload} />
                </InlineNotification>
            </View>
        )
    }

    if (loading || game === null || round === null) {
        return <LoadingPage message='Spel laden…' />;
    }

    return (
        <View style={styles.page}>
            <PlayingGame
                game={game}
                round={round}
                userId={user?.id ?? ''}
                online={online}
                onGuess={guess}
                myTurn={myTurn}
                typing={typing}
                onTyping={onTyping}
                // Only while there is somewhere to go on to. The last round's verdict is
                // the end of the game, and `onFinish` is where that leads instead.
                onNextRound={gameOver ? undefined : nextRound}
                onFinish={onFinish}
            />
        </View>
    )
}

interface RoomResultsProps {
    table: MultiplayerGameState,
    isHost: boolean,
    onPlayAgain: () => void,
    playingAgain: boolean,
    error: string | null
}

/**
 * The end of the game, still inside the room.
 *
 * No `useFullScreen`: a scoreboard is an ordinary page and wants the scroll and the
 * bottom bar back, and unmounting the board is what gives them up.
 */
function RoomResults({ table, isHost, onPlayAgain, playingAgain, error }: RoomResultsProps) {
    const { user } = useAuth();

    const { game, online } = table;

    // Only while the board is still loading, which by this point it is not — the room
    // does not reach the uitslag without having played a game on screen first.
    if (game === null) {
        return <LoadingPage message='Uitslag laden…' />;
    }

    return (
        <MultiplayerResults
            game={game}
            userId={user?.id ?? ''}
            online={online}
            isHost={isHost}
            onPlayAgain={onPlayAgain}
            playingAgain={playingAgain}
            error={error}
        />
    )
}

const useStyles = createThemedStyles(theme => ({
    page: {
        flex: 1,
        width: '100%',
        gap: Spacing.two
    }
}))
