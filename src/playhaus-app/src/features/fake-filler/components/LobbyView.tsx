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
    /**
     * The host started the game. The room screens differ in where that leads — the host
     * is on `/room` and has to travel to the code, a guest is already there — so it is
     * the caller's to answer.
     */
    onStarted: (lobby: FFLobby) => void
}

/**
 * The waiting room: everything both people in it have in common, and then which of the
 * two screens they get.
 *
 * The split between host and guest is not only permission. A host is setting something up
 * and a guest is waiting for something to happen, and those want opposite screens — one
 * is a code, a roster and a big green light, the other is a held breath. So this keeps
 * what is genuinely shared (the three states where there is no room to show, and the
 * question asked on the way out) and hands the room itself to one of the two.
 *
 * The page claims the whole viewport. Both halves pin something top and bottom, and inside
 * the root layout's shared scroller there is nothing for a page to pin against.
 */
export default function LobbyView({ state, onStarted }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    const router = useRouter();
    const { lobby, isHost, closing } = state;

    // Both claimed before the early returns below, because a hook cannot be called for one
    // branch and not another. The waiting and failed states are the same page as the room
    // — they just have less on them.
    useFullScreen();

    // The other half of the room's soundtrack. This one component is both ways into a
    // room — `/room` reaches it through `OpenRoom`, `/room/[code]` renders it directly —
    // so the claim belongs here rather than on either page.
    useMusic('lobby');

    /** The confirm panel is up. Leaving is destructive for the host and rude otherwise. */
    const [leaving, setLeaving] = useState(false);

    // The host shut the room while this player was sitting in it. The code no longer
    // works, so there is nothing to offer but the way out: a retry would only find the
    // same 404.
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

            {/*
              * The one thing on this screen that cannot be undone, so it is asked rather
              * than done. Both screens' back chips lead here, which is the reason they
              * are buttons of their own rather than the header's link.
              */}
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
