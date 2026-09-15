import { useChromeless } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import PopupModal from "@/components/ui/PopupModal";
import RoomClosedNotice from "@/components/ui/RoomClosedNotice";
import ScoreBoardScreen from "@/components/ui/ScoreBoardScreen";
import TextButton from "@/components/ui/TextButton";
import { FAKE_FILLER } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import LobbyView from "@/features/fake-filler/components/LobbyView";
import PlayingGame from "@/features/fake-filler/components/play/PlayingGame";
import { useGame } from "@/features/fake-filler/useGame";
import { useLobby } from "@/features/fake-filler/useLobby";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { avatarColorById } from "@/utils/color-utils";
import { RelativePathString, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

// A room, joined by its code.
export default function FakeFillerRoomPage() {
    const { code } = useLocalSearchParams<{ code: string }>();
    const router = useRouter();
    const t = useT();

    const state = useLobby(code);

    const gameId = state.lobby?.status === 'started' ? state.lobby.gameId : undefined;
    const table = useGame(gameId, code);

    /** The board has had its last reveal read and the room is showing the result. */
    const [finished, setFinished] = useState(false);
    // Stable: the board hangs the end of the last reveal off this.
    const finish = useCallback(() => setFinished(true), []);

    // A different game under the same screen, which is exactly what playing again is.
    const [showing, setShowing] = useState(gameId);
    if (showing !== gameId) {
        setShowing(gameId);
        setFinished(false);
    }

    /** The leave confirm, which the board's close button raises. */
    const [leaving, setLeaving] = useState(false);

    // The host opened the next room, so everybody still here goes to it.
    const { rematchCode } = state;
    useEffect(() => {
        if (rematchCode === null || rematchCode === code) return;

        router.replace(ROUTES.fakeFillerRoom(rematchCode) as RelativePathString);
    }, [rematchCode, code, router]);

    // The host stopped the game, or shut the room out from under everybody waiting in it.
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

    // The result, rather than the board.
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
                        // The room is not handed back — a game in progress is not a seat to give up.
                        router.replace(ROUTES.fakeFillerIndex);
                    }}
                />
            );
    }

    return (
        <LobbyView
            state={state}
            // Nothing to do: this screen is already the room the game started in.
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

    // The claim lives here rather than on the page.
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
                tone='danger'
                onRequestClose={onStay}
                actions={<>
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
                </>}
            />
        </View>
    )
}

interface RoomResultsProps {
    state: ReturnType<typeof useLobby>,
    table: ReturnType<typeof useGame>
}

// The end of the game, still inside the room.
function RoomResults({ state, table }: RoomResultsProps) {
    const { user } = useAuth();
    const router = useRouter();
    const t = useT();

    useChromeless();

    const { game } = table;

    // Only while the board is still loading, which by this point it is not.
    if (game === null) {
        return <LoadingPage message={t('fakeFiller.results.loading')} />;
    }

    const players = game.players.map(player => ({
        id: player.userId,
        name: player.name,
        score: player.score,
        swatch: avatarColorById(player.avatarColorId)
    }));

    return (
        <ScoreBoardScreen
            game={FAKE_FILLER}
            players={players}
            totalRounds={game.totalRounds}
            youId={user?.id}
            onClose={() => router.replace(ROUTES.fakeFillerIndex)}
            action={state.isHost
                ? {
                    text: state.rematching ? t('fakeFiller.lobby.opening') : t('scoreboard.playAgain'),
                    icon: 'rotate-ccw',
                    disabled: state.rematching,
                    onPress: () => void state.rematch()
                }
                : undefined}
            error={state.actionError}
            waitingForHost={!state.isHost}
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
