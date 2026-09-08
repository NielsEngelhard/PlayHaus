import type { Lobby } from "@/api/calls/league-of-letters-lobby";
import { useFullScreen } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import BackButton from "@/components/ui/BackButton";
import InlineNotification from "@/components/ui/InlineNotification";
import PopupModal from "@/components/ui/PopupModal";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { useMusic } from "@/features/audio/MusicContext";
import GuestLobby from "@/features/league-of-letters/components/GuestLobby";
import HostLobby from "@/features/league-of-letters/components/HostLobby";
import RoomClosedNotice from "@/components/ui/RoomClosedNotice";
import type { LobbyState } from "@/features/league-of-letters/useLobby";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useT } from "@/features/i18n/LanguageContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

interface Props {
    /** Everything `useLobby` returned. The screen drives the room entirely through it. */
    state: LobbyState,
    // The host started the game.
    onStarted: (lobby: Lobby) => void
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

    // The host shut the lobby while this player was sitting in it.
    if (state.closed) {
        return (
            <RoomClosedNotice
                message={t('lol.lobby.hostClosedLobby')}
                href={ROUTES.leagueOfLettersIndex}
            />
        );
    }

    if (state.error !== null) {
        return (
            <View style={styles.screen}>
                <BackButton href={ROUTES.leagueOfLettersIndex} />

                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title={t('lol.lobby.noLobby')}
                    message={t(state.error)}
                >
                    <TextButton text={t('common.retry')} onPress={state.reload} />
                </InlineNotification>
            </View>
        )
    }

    if (lobby === null) {
        return <LoadingPage message={t('lol.lobby.opening')} />;
    }

    /** Hand the lobby back, then go. Both halves matter, so the modal waits for the first. */
    async function leave() {
        await state.close();
        router.replace(ROUTES.leagueOfLettersIndex);
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
                title={isHost ? t('lol.lobby.confirmClose.title') : t('lol.lobby.confirmLeave.title')}
                message={isHost
                    ? t('lol.lobby.confirmClose.message')
                    : t('lol.lobby.confirmLeave.message')}
                onRequestClose={() => setLeaving(false)}
            >
                <TextButton
                    text={closing ? t('common.busy') : isHost ? t('lol.lobby.confirmClose.action') : t('lol.lobby.confirmLeave.action')}
                    variant='primary'
                    fullWidth
                    disabled={closing}
                    onPress={() => void leave()}
                />

                <TextButton
                    text={t('lol.lobby.stay')}
                    variant='muted'
                    fullWidth
                    disabled={closing}
                    onPress={() => setLeaving(false)}
                />
            </PopupModal>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    screen: {
        flex: 1,
        width: '100%'
    }
}))
