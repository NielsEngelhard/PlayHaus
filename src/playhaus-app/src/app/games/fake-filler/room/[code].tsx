import { useChromeless } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import PopupModal from "@/components/ui/PopupModal";
import RoomClosedNotice from "@/components/ui/RoomClosedNotice";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import LobbyView from "@/features/fake-filler/components/LobbyView";
import PlayingGame from "@/features/fake-filler/components/play/PlayingGame";
import Results from "@/features/fake-filler/components/play/Results";
import { useGame } from "@/features/fake-filler/useGame";
import { useLobby } from "@/features/fake-filler/useLobby";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { RelativePathString, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

/**
 * A room, joined by its code.
 *
 * Three screens in one, and which one you get is the room's own business: while the room
 * is waiting this is the lobby, the moment the host starts — which a guest finds out about
 * through the socket — it becomes the board, and when the last round has been read it
 * becomes the result. The host arrives here already on the second of the three, having
 * started the game on the way over.
 *
 * The ending stays inside this screen rather than moving to a page of its own, and that is
 * the whole reason playing again works: the room's socket is what carries everybody into
 * the next lobby, and a result that navigated away would hang up on the one connection
 * that can deliver the new code.
 */
export default function FakeFillerRoomPage() {
    const { code } = useLocalSearchParams<{ code: string }>();
    const router = useRouter();
    const t = useT();

    const state = useLobby(code);

    const gameId = state.lobby?.status === 'started' ? state.lobby.gameId : undefined;
    const table = useGame(gameId, code);

    /** The board has had its last reveal read and the room is showing the result. */
    const [finished, setFinished] = useState(false);
    // Stable: the board hangs the end of the last reveal off this, and a callback rebuilt
    // on every frame the room delivers would be a new prop on every vote.
    const finish = useCallback(() => setFinished(true), []);

    // A different game under the same screen, which is exactly what playing again is: the
    // route's code changes but the screen behind it is reused, so a result left standing
    // would be the next game's board replaced by the last game's scoreboard before a word
    // had been written. Adjusted during render, so it is never painted.
    const [showing, setShowing] = useState(gameId);
    if (showing !== gameId) {
        setShowing(gameId);
        setFinished(false);
    }

    /** The leave confirm, which the board's close button raises. */
    const [leaving, setLeaving] = useState(false);

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

        router.replace(ROUTES.fakeFillerRoom(rematchCode) as RelativePathString);
    }, [rematchCode, code, router]);

    // The host stopped the game, or shut the room out from under everybody waiting in it.
    // Checked ahead of the board, because that is where the people who need telling are
    // sitting: the board reads the same room but has no lobby screen of its own, so
    // without this a stopped game is a prompt that quietly stops answering.
    if (state.closed) {
        return (
            <RoomClosedNotice
                message={gameId !== undefined
                    ? t('fakeFiller.lobby.hostStoppedGame')
                    : t('fakeFiller.lobby.hostClosedLobby')}
                href={ROUTES.fakeFillerIndex}
            />
        )
    }

    /**
     * The result, rather than the board.
     *
     * Two ways to get here, and the second is the one that is easy to miss. Normally the
     * last reveal is read and `finish` is called. But a player who reloads *after* the
     * game ended never sees that reveal — they are handed a completed game with nothing
     * to vote on — and without the second clause they would sit on a board whose last
     * round is already decided. `reveal` is checked so that finishing the ordinary way
     * still shows the last round before the scoreboard replaces it.
     */
    const showResults = finished || (table.gameOver && table.reveal === null);

    if (gameId !== undefined) {
        return showResults
            ? <RoomResults state={state} table={table} />
            : (
                <RoomGame
                    table={table}
                    onClose={() => setLeaving(true)}
                    onFinish={finish}
                    leaving={leaving}
                    onStay={() => setLeaving(false)}
                    onLeave={() => {
                        // The room is not handed back — a game in progress is not a seat
                        // to give up, and `useLobby` already stopped owing it the moment
                        // the game started. This is only a way off the screen.
                        router.replace(ROUTES.fakeFillerIndex);
                    }}
                />
            );
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
    table: ReturnType<typeof useGame>,
    onClose: () => void,
    onFinish: () => void,
    leaving: boolean,
    onStay: () => void,
    onLeave: () => void
}

/** The board, which is the only one of the three screens that claims the whole window. */
function RoomGame({ table, onClose, onFinish, leaving, onStay, onLeave }: RoomGameProps) {
    const styles = useStyles();
    const t = useT();

    // The claim lives here rather than on the page: a board fits the window exactly and
    // draws its own header, and neither the lobby nor the result does — they are columns
    // of cards that want the ordinary scrolling page, the bottom bar and the app's header.
    // A hook cannot be called for one and not the others, so the board is its own
    // component.
    useChromeless();

    const { user } = useAuth();

    return (
        <View style={styles.page}>
            <PlayingGame
                table={table}
                userId={user?.id ?? ''}
                onClose={onClose}
                onFinish={onFinish}
            />

            <PopupModal
                visible={leaving}
                title={t('fakeFiller.lobby.confirmLeave.title')}
                message={t('fakeFiller.lobby.confirmLeave.message')}
                onRequestClose={onStay}
            >
                <TextButton
                    text={t('fakeFiller.lobby.confirmLeave.action')}
                    variant='primary'
                    fullWidth
                    onPress={onLeave}
                />

                <TextButton
                    text={t('fakeFiller.lobby.stay')}
                    variant='muted'
                    fullWidth
                    onPress={onStay}
                />
            </PopupModal>
        </View>
    )
}

interface RoomResultsProps {
    state: ReturnType<typeof useLobby>,
    table: ReturnType<typeof useGame>
}

/**
 * The end of the game, still inside the room.
 *
 * No viewport claim: a scoreboard is an ordinary page and wants the scroll and the bottom
 * bar back, and unmounting the board is what gives them up.
 */
function RoomResults({ state, table }: RoomResultsProps) {
    const { user } = useAuth();
    const t = useT();

    const { game, online } = table;

    // Only while the board is still loading, which by this point it is not: the room does
    // not reach the result without having played a game on screen first.
    if (game === null) {
        return <LoadingPage message={t('fakeFiller.results.loading')} />;
    }

    return (
        <Results
            players={game.players}
            userId={user?.id ?? ''}
            online={online}
            isHost={state.isHost}
            onPlayAgain={() => void state.rematch()}
            playingAgain={state.rematching}
            error={state.actionError}
        />
    )
}

const useStyles = createThemedStyles(() => ({
    page: {
        flex: 1,
        width: '100%',
        gap: Spacing.two
    }
}))
