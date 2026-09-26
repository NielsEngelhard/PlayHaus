import type { WWLobby } from "@/api/calls/witty-wars-lobby";
import { useFullScreen } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import BackButton from "@/components/ui/BackButton";
import InlineNotification from "@/components/ui/InlineNotification";
import PopupModal from "@/components/ui/PopupModal";
import RoomClosedNotice from "@/components/ui/RoomClosedNotice";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { useMusic } from "@/features/audio/MusicContext";
import GuestLobby from "@/features/witty-wars/components/GuestLobby";
import HostLobby from "@/features/witty-wars/components/HostLobby";
import type { WWLobbyState } from "@/features/witty-wars/useLobby";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

interface Props {
    /** Everything `useLobby` returned. The screen drives the room entirely through it. */
    state: WWLobbyState,
    // The host started the game.
    onStarted: (lobby: WWLobby) => void
}

// The waiting room: everything both people in it have in common, and then which of the two screens they get.
export default function LobbyView({ state, onStarted }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    const router = useRouter();
    const { lobby, isHost, closing } = state;

    // Both claimed before the early returns below, because a hook cannot be called for one branch and not another.
    useFullScreen();

    // The other half of the room's soundtrack.
    useMusic('lobby');

    /** The confirm panel is up. Leaving is destructive for the host and rude otherwise. */
    const [leaving, setLeaving] = useState(false);

    // A code that is gone and a code that was never right are the same answer, and a retry cannot fix either.
    useEffect(() => {
        if (state.error !== 'wittyWars.errors.lobbyGone') return;

        router.replace({ pathname: ROUTES.reconnect, params: { notfound: 'true' } });
    }, [state.error, router]);

    // The host shut the room while this player was sitting in it.
    if (state.closed) {
        return (
            <RoomClosedNotice
                message={t('wittyWars.lobby.hostClosedLobby')}
                href={ROUTES.wittyWarsIndex}
            />
        );
    }

    if (state.error === 'wittyWars.errors.lobbyGone') {
        return null;
    }

    if (state.error !== null) {
        return (
            <View style={styles.screen}>
                <BackButton href={ROUTES.wittyWarsIndex} />

                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title={t('wittyWars.lobby.noLobby')}
                    message={t(state.error)}
                >
                    <TextButton text={t('common.retry')} onPress={state.reload} />
                </InlineNotification>
            </View>
        )
    }

    if (lobby === null) {
        return <LoadingPage message={t('wittyWars.lobby.opening')} />;
    }

    /** Hand the room back, then go. Both halves matter, so the modal waits for the first. */
    async function leave() {
        await state.close();
        router.replace(ROUTES.wittyWarsIndex);
    }

    async function start() {
        const started = await state.start();
        if (started !== null) onStarted(started);
    }

    return (
        <View style={styles.screen}>
            {isHost ? (
                <HostLobby
                    state={state}
                    lobby={lobby}
                    onBack={() => setLeaving(true)}
                    onStart={() => void start()}
                />
            ) : (
                <GuestLobby
                    state={state}
                    lobby={lobby}
                    onBack={() => setLeaving(true)}
                />
            )}

            {/* The one thing on this screen that cannot be undone, so it is asked rather than done. */}
            <PopupModal
                visible={leaving}
                title={isHost
                    ? t('wittyWars.lobby.confirmClose.title')
                    : t('wittyWars.lobby.confirmLeave.title')}
                message={isHost
                    ? t('wittyWars.lobby.confirmClose.message')
                    : t('wittyWars.lobby.confirmLeave.message')}
                onRequestClose={() => setLeaving(false)}
                tone='danger'
                actions={<>
                    <TextButton
                        text={closing
                            ? t('common.busy')
                            : isHost
                                ? t('wittyWars.lobby.confirmClose.action')
                                : t('wittyWars.lobby.confirmLeave.action')}
                        variant='primary'
                        fullWidth
                        disabled={closing}
                        onPress={() => void leave()}
                    />

                    <TextButton
                        text={t('wittyWars.lobby.stay')}
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
