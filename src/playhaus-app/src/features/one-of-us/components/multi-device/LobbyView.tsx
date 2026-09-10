import type { OOULobby } from '@/api/calls/one-of-us-lobby';
import { useFullScreen } from '@/components/layout/FullScreenContext';
import LoadingPage from '@/components/layout/LoadingPage';
import BackButton from '@/components/ui/BackButton';
import InlineNotification from '@/components/ui/InlineNotification';
import PopupModal from '@/components/ui/PopupModal';
import RoomClosedNotice from '@/components/ui/RoomClosedNotice';
import TextButton from '@/components/ui/TextButton';
import { ROUTES } from '@/constants/routes';
import { useMusic } from '@/features/audio/MusicContext';
import { useT } from '@/features/i18n/LanguageContext';
import GuestLobby from '@/features/one-of-us/components/multi-device/GuestLobby';
import HostLobby from '@/features/one-of-us/components/multi-device/HostLobby';
import type { OOULobbyState } from '@/features/one-of-us/useOneOfUsLobby';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useTheme } from '@/features/theme/ThemeContext';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

interface Props {
    // The host started the game.
    onStarted: (lobby: OOULobby) => void
    /** Everything useOneOfUsLobby returned. The screen drives the room entirely through it. */
    state: OOULobbyState
}

// The waiting room: everything both people in it have in common, and then which of the two screens they get.
export default function LobbyView({ onStarted, state }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    const router = useRouter();
    const { lobby, isHost, closing } = state;

    // Both claimed before the early returns below, because a hook cannot be called for one branch and not another.
    useFullScreen();
    useMusic('lobby');

    /** The confirm panel is up. Leaving is destructive for the host and rude otherwise. */
    const [leaving, setLeaving] = useState(false);

    // The host shut the room while this player was sitting in it.
    if (state.closed) {
        return (
            <RoomClosedNotice
                message={t('oneOfUs.multiDevice.lobby.hostClosedLobby')}
                href={ROUTES.oneOfUsIndex}
            />
        );
    }

    if (state.error !== null) {
        return (
            <View style={styles.screen}>
                <BackButton href={ROUTES.oneOfUsIndex} />

                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title={t('oneOfUs.multiDevice.lobby.noLobby')}
                    message={t(state.error)}
                >
                    <TextButton text={t('common.retry')} onPress={state.reload} />
                </InlineNotification>
            </View>
        )
    }

    if (lobby === null) {
        return <LoadingPage message={t('oneOfUs.multiDevice.lobby.opening')} />;
    }

    /** Hand the room back, then go. Both halves matter, so the modal waits for the first. */
    async function leave() {
        await state.close();
        router.replace(ROUTES.oneOfUsIndex);
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
                    ? t('oneOfUs.multiDevice.lobby.confirmClose.title')
                    : t('oneOfUs.multiDevice.lobby.confirmLeave.title')}
                message={isHost
                    ? t('oneOfUs.multiDevice.lobby.confirmClose.message')
                    : t('oneOfUs.multiDevice.lobby.confirmLeave.message')}
                onRequestClose={() => setLeaving(false)}
            >
                <TextButton
                    text={closing
                        ? t('common.busy')
                        : isHost
                            ? t('oneOfUs.multiDevice.lobby.confirmClose.action')
                            : t('oneOfUs.multiDevice.lobby.confirmLeave.action')}
                    variant='primary'
                    fullWidth
                    disabled={closing}
                    onPress={() => void leave()}
                />

                <TextButton
                    text={t('oneOfUs.multiDevice.lobby.stay')}
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
