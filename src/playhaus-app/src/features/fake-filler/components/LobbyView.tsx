import type { FFLobby } from "@/api/calls/fake-filler-lobby";
import { useFullScreen } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import BackButton from "@/components/ui/BackButton";
import InlineNotification from "@/components/ui/InlineNotification";
import PopupModal from "@/components/ui/PopupModal";
import RoomClosedNotice from "@/components/ui/RoomClosedNotice";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { useMusic } from "@/features/audio/MusicContext";
import GuestLobby from "@/features/fake-filler/components/GuestLobby";
import HostLobby from "@/features/fake-filler/components/HostLobby";
import type { FFLobbyState } from "@/features/fake-filler/useLobby";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

interface Props {
    /** Everything `useLobby` returned. The screen drives the room entirely through it. */
    state: FFLobbyState,
    // The host started the game.
    onStarted: (lobby: FFLobby) => void
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

    // The host shut the room while this player was sitting in it.
    if (state.closed) {
        return (
            <RoomClosedNotice
                message={t('fakeFiller.lobby.hostClosedLobby')}
                href={ROUTES.fakeFillerIndex}
            />
        );
    }

    if (state.error !== null) {
        return (
            <View style={styles.screen}>
                <BackButton href={ROUTES.fakeFillerIndex} />

                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title={t('fakeFiller.lobby.noLobby')}
                    message={t(state.error)}
                >
                    <TextButton text={t('common.retry')} onPress={state.reload} />
                </InlineNotification>
            </View>
        )
    }

    if (lobby === null) {
        return <LoadingPage message={t('fakeFiller.lobby.opening')} />;
    }

    /** Hand the room back, then go. Both halves matter, so the modal waits for the first. */
    async function leave() {
        await state.close();
        router.replace(ROUTES.fakeFillerIndex);
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
                    ? t('fakeFiller.lobby.confirmClose.title')
                    : t('fakeFiller.lobby.confirmLeave.title')}
                message={isHost
                    ? t('fakeFiller.lobby.confirmClose.message')
                    : t('fakeFiller.lobby.confirmLeave.message')}
                onRequestClose={() => setLeaving(false)}
            >
                <TextButton
                    text={closing
                        ? t('common.busy')
                        : isHost
                            ? t('fakeFiller.lobby.confirmClose.action')
                            : t('fakeFiller.lobby.confirmLeave.action')}
                    variant='primary'
                    fullWidth
                    disabled={closing}
                    onPress={() => void leave()}
                />

                <TextButton
                    text={t('fakeFiller.lobby.stay')}
                    variant='muted'
                    fullWidth
                    disabled={closing}
                    onPress={() => setLeaving(false)}
                />
            </PopupModal>
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    screen: {
        flex: 1,
        width: '100%'
    }
}))
