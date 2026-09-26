import type { PQLobby } from "@/api/calls/pubquizr-lobby";
import { useFullScreen } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import BackButton from "@/components/ui/BackButton";
import InlineNotification from "@/components/ui/InlineNotification";
import PopupModal from "@/components/ui/PopupModal";
import RoomClosedNotice from "@/components/ui/RoomClosedNotice";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/features/i18n/LanguageContext";
import GuestRoom from "@/features/pubquizr/components/room/GuestRoom";
import HostRoom from "@/features/pubquizr/components/room/HostRoom";
import ScreenPairing from "@/features/pubquizr/components/room/ScreenPairing";
import type { PQLobbyState } from "@/features/pubquizr/multi-device/useQuizLobby";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

interface Props {
    /** Everything `useQuizLobby` returned. The screen drives the room entirely through it. */
    state: PQLobbyState,
    // The host dealt the evening.
    onStarted: (lobby: PQLobby) => void
}

// The waiting room: everything both people in it have in common, and then which of the two screens they get.
export default function QuizLobbyView({ state, onStarted }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    const router = useRouter();
    const { lobby, isHost, closing } = state;

    // Claimed before the early returns below, because a hook cannot be called for one branch and not another.
    useFullScreen();

    /** The confirm panel is up. Leaving is destructive for the host and rude otherwise. */
    const [leaving, setLeaving] = useState(false);

    // A code that is gone and a code that was never right are the same answer, and a retry cannot fix either.
    useEffect(() => {
        if (state.error !== 'pubquizr.errors.lobbyGone') return;

        router.replace({ pathname: ROUTES.reconnect, params: { notfound: 'true' } });
    }, [state.error, router]);

    // The host shut the room while this player was sitting in it.
    if (state.closed) {
        return (
            <RoomClosedNotice
                message={t('pubquizr.lobby.hostClosedLobby')}
                href={ROUTES.quizzerIndex}
            />
        );
    }

    if (state.error === 'pubquizr.errors.lobbyGone') {
        return null;
    }

    if (state.error !== null) {
        return (
            <View style={styles.screen}>
                <BackButton href={ROUTES.quizzerIndex} />

                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title={t('pubquizr.lobby.noLobby')}
                    message={t(state.error)}
                >
                    <TextButton text={t('common.retry')} onPress={state.reload} />
                </InlineNotification>
            </View>
        )
    }

    if (lobby === null) {
        return <LoadingPage message={t('pubquizr.lobby.opening')} />;
    }

    /** Hand the room back, then go. Both halves matter, so the modal waits for the first. */
    async function leave() {
        await state.close();
        router.replace(ROUTES.quizzerIndex);
    }

    async function start() {
        const started = await state.start();
        if (started !== null) onStarted(started);
    }

    // A central-screen room is not a room until a television is watching, and it becomes one again if that television goes.
    // Not yet knowing counts as no screen, so the lobby never flashes past on the way in.
    const pairing = lobby.setup.hostScreen && lobby.status === 'waiting' && state.screenOnline !== true;

    return (
        <View style={styles.screen}>
            {isHost && pairing ? (
                <ScreenPairing
                    state={state}
                    lobby={lobby}
                    onBack={() => setLeaving(true)}
                />
            ) : isHost ? (
                <HostRoom
                    state={state}
                    lobby={lobby}
                    onBack={() => setLeaving(true)}
                    onStart={() => void start()}
                />
            ) : (
                <GuestRoom
                    state={state}
                    lobby={lobby}
                    onBack={() => setLeaving(true)}
                />
            )}

            {/* The one thing on this screen that cannot be undone, so it is asked rather than done. */}
            <PopupModal
                visible={leaving}
                title={isHost
                    ? t('pubquizr.lobby.confirmClose.title')
                    : t('pubquizr.lobby.confirmLeave.title')}
                message={isHost
                    ? t('pubquizr.lobby.confirmClose.message')
                    : t('pubquizr.lobby.confirmLeave.message')}
                tone='danger'
                onRequestClose={() => setLeaving(false)}
                actions={<>
                    <TextButton
                        text={closing
                            ? t('common.busy')
                            : isHost
                                ? t('pubquizr.lobby.confirmClose.action')
                                : t('pubquizr.lobby.confirmLeave.action')}
                        variant='primary'
                        fullWidth
                        disabled={closing}
                        onPress={() => void leave()}
                    />

                    <TextButton
                        text={t('pubquizr.lobby.stay')}
                        variant='muted'
                        fullWidth
                        disabled={closing}
                        onPress={() => setLeaving(false)}
                    />
                </>}
            />
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    screen: {
        flex: 1,
        width: '100%'
    }
}))
