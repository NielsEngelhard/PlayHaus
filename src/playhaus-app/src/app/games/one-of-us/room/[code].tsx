import { useChromeless } from '@/components/layout/FullScreenContext';
import LoadingPage from '@/components/layout/LoadingPage';
import PopupModal from '@/components/ui/PopupModal';
import RoomClosedNotice from '@/components/ui/RoomClosedNotice';
import TextButton from '@/components/ui/TextButton';
import { ROUTES } from '@/constants/routes';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/useAuth';
import { useT } from '@/features/i18n/LanguageContext';
import LobbyView from '@/features/one-of-us/components/multi-device/LobbyView';
import MultiDeviceGameOver from '@/features/one-of-us/components/multi-device/MultiDeviceGameOver';
import PlayingGame from '@/features/one-of-us/components/multi-device/PlayingGame';
import { useMultiDeviceOneOfUsGame } from '@/features/one-of-us/useMultiDeviceOneOfUsGame';
import { useOneOfUsLobby } from '@/features/one-of-us/useOneOfUsLobby';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { RelativePathString, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

// A room, joined by its code: the lobby, the board and the result, in that order.
export default function OneOfUsRoomPage() {
    const { code } = useLocalSearchParams<{ code: string }>();
    const router = useRouter();
    const t = useT();

    const state = useOneOfUsLobby(code);

    const gameId = state.lobby?.status === 'started' ? state.lobby.gameId : undefined;
    const table = useMultiDeviceOneOfUsGame(gameId, code);

    /** The last elimination has been read and the room is showing the result. */
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

        router.replace(ROUTES.oneOfUsRoom(rematchCode) as RelativePathString);
    }, [rematchCode, code, router]);

    // The host stopped the game, or shut the room out from under everybody waiting in it.
    if (state.closed) {
        return (
            <RoomClosedNotice
                message={gameId !== undefined
                    ? t('oneOfUs.multiDevice.lobby.hostStoppedGame')
                    : t('oneOfUs.multiDevice.lobby.hostClosedLobby')}
                href={ROUTES.oneOfUsIndex}
            />
        )
    }

    // The result, rather than the board. The reveal term is what lets the last elimination land before the confetti.
    const showResults = finished || (table.gameOver && table.reveal === null);

    if (gameId !== undefined) {
        return showResults
            ? <RoomResult state={state} table={table} />
            : (
                <RoomGame
                    table={table}
                    leaving={leaving}
                    onClose={() => setLeaving(true)}
                    onFinish={finish}
                    onStay={() => setLeaving(false)}
                    onLeave={() => {
                        // The room is not handed back — a game in progress is not a seat to give up.
                        router.replace(ROUTES.oneOfUsIndex);
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
    leaving: boolean
    onClose: () => void
    onFinish: () => void
    onLeave: () => void
    onStay: () => void
    table: ReturnType<typeof useMultiDeviceOneOfUsGame>
}

/** The board, which is the only one of the three screens that claims the whole window. */
function RoomGame({ leaving, onClose, onFinish, onLeave, onStay, table }: RoomGameProps) {
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
                title={t('oneOfUs.multiDevice.lobby.confirmLeave.title')}
                message={t('oneOfUs.multiDevice.lobby.confirmLeave.message')}
                onRequestClose={onStay}
            >
                <TextButton
                    text={t('oneOfUs.multiDevice.lobby.confirmLeave.action')}
                    variant='primary'
                    fullWidth
                    onPress={onLeave}
                />

                <TextButton
                    text={t('oneOfUs.multiDevice.lobby.stay')}
                    variant='muted'
                    fullWidth
                    onPress={onStay}
                />
            </PopupModal>
        </View>
    )
}

interface RoomResultProps {
    state: ReturnType<typeof useOneOfUsLobby>
    table: ReturnType<typeof useMultiDeviceOneOfUsGame>
}

// The end of the game, still inside the room.
function RoomResult({ state, table }: RoomResultProps) {
    const router = useRouter();
    const t = useT();

    // The result claims the window too: it lays its own band and its own gutters.
    useChromeless();

    const { game } = table;

    // Only while the board is still loading, which by this point it is not.
    if (game === null) {
        return <LoadingPage message={t('oneOfUs.multiDevice.play.loading')} />;
    }

    return (
        <MultiDeviceGameOver
            game={game}
            // Only the host may open the next room, and everybody else is carried there by the rematch frame.
            onAgain={state.isHost ? () => void state.rematch() : null}
            onLeave={() => router.replace(ROUTES.oneOfUsIndex)}
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
