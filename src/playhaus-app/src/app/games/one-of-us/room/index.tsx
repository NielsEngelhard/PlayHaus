import { abandonOOULobby, getCurrentOOULobby, type OOULobby } from '@/api/calls/one-of-us-lobby';
import LoadingPage from '@/components/layout/LoadingPage';
import AppText from '@/components/text/AppText';
import PopupModal from '@/components/ui/PopupModal';
import TextButton from '@/components/ui/TextButton';
import { ROUTES } from '@/constants/routes';
import { FontSizes, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/useAuth';
import type { TranslationKey } from '@/features/i18n/keys';
import { useT } from '@/features/i18n/LanguageContext';
import LobbyView from '@/features/one-of-us/components/multi-device/LobbyView';
import { oneOfUsLobbyErrorMessage } from '@/features/one-of-us/game-errors';
import { settleOOUGiveBacks, useOneOfUsLobby } from '@/features/one-of-us/useOneOfUsLobby';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { RelativePathString, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

// Opening a room — after checking there is not already one open.
export default function OneOfUsCreateRoomPage() {
    const router = useRouter();
    const styles = useStyles();
    const t = useT();

    const { status } = useAuth();

    /** False until the server has said whether there is already a room. */
    const [checked, setChecked] = useState(false);
    /** The room that was already open, until the host has said what to do with it. */
    const [running, setRunning] = useState<OOULobby | null>(null);
    const [abandoning, setAbandoning] = useState(false);
    const [abandonError, setAbandonError] = useState<TranslationKey | null>(null);

    // Nothing may touch state after unmount.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    // Only a signed-in session has a room to find; while the session is being restored there is nothing to ask about yet.
    const signedIn = status === 'signedIn';

    useEffect(() => {
        if (!signedIn) return;

        void (async () => {
            // The screen this one replaced hands its room back on the way out, and it cannot await that — it is already gone.
            await settleOOUGiveBacks();
            if (!mounted.current) return;

            let found: OOULobby | null = null;
            try {
                found = await getCurrentOOULobby();
            } catch {
                // The check failing is not worth stopping on.
            }

            if (!mounted.current) return;

            setRunning(found);
            setChecked(true);
        })();
    }, [signedIn]);

    /** Back to the room they left, board and all. */
    function resume(lobby: OOULobby) {
        // `replace`, not `push`: this screen would send the host straight back to the room they just came from.
        router.replace(ROUTES.oneOfUsRoom(lobby.code) as RelativePathString);
    }

    // Throw the room away — and the game in it, if it got that far — and stay here.
    async function abandon(lobby: OOULobby) {
        if (abandoning) return;

        setAbandoning(true);
        setAbandonError(null);

        try {
            await abandonOOULobby(lobby.code);
            if (!mounted.current) return;

            setRunning(null);
        } catch (failure) {
            if (!mounted.current) return;

            // Kept open on failure.
            setAbandonError(oneOfUsLobbyErrorMessage(failure));
        } finally {
            if (mounted.current) setAbandoning(false);
        }
    }

    // Held back until the answer is in.
    if (!checked) {
        return <LoadingPage message={t('oneOfUs.multiDevice.lobby.opening')} />;
    }

    if (running !== null) {
        // A room that has started is a game with people sitting at it; one that has not is a door standing open.
        const playing = running.status === 'started';

        return (
            // Nothing behind the panel: the room this screen exists to open is exactly what must not be made until the question is answered.
            <View style={styles.screen}>
                <PopupModal
                    visible
                    title={playing
                        ? t('oneOfUs.multiDevice.lobby.running.gameTitle')
                        : t('oneOfUs.multiDevice.lobby.running.lobbyTitle')}
                    message={playing
                        ? t('oneOfUs.multiDevice.lobby.running.gameMessage', { code: running.code })
                        : t('oneOfUs.multiDevice.lobby.running.lobbyMessage', { code: running.code })}
                >
                    {abandonError && (
                        <AppText style={styles.abandonError}>{t(abandonError)}</AppText>
                    )}

                    <TextButton
                        text={playing
                            ? t('oneOfUs.multiDevice.lobby.running.resumeGame')
                            : t('oneOfUs.multiDevice.lobby.running.resumeLobby')}
                        variant='primary'
                        fullWidth
                        disabled={abandoning}
                        onPress={() => resume(running)}
                    />

                    <TextButton
                        text={abandoning
                            ? t('common.busy')
                            : playing
                                ? t('oneOfUs.multiDevice.lobby.running.stopGame')
                                : t('oneOfUs.multiDevice.lobby.running.closeLobby')}
                        variant='muted'
                        fullWidth
                        disabled={abandoning}
                        onPress={() => void abandon(running)}
                    />

                    <TextButton
                        text={t('common.backToGames')}
                        variant='muted'
                        fullWidth
                        disabled={abandoning}
                        onPress={() => router.replace(ROUTES.oneOfUsIndex)}
                    />
                </PopupModal>
            </View>
        )
    }

    return <OpenRoom />;
}

// The room itself.
function OpenRoom() {
    const router = useRouter();

    // No code: this player is opening a room rather than joining one, which makes them its host.
    const state = useOneOfUsLobby();

    return (
        <LobbyView
            state={state}
            // `replace`, not `push`: the room this screen was is gone the moment the game starts.
            onStarted={lobby => router.replace(
                ROUTES.oneOfUsRoom(lobby.code) as RelativePathString
            )}
        />
    )
}

const useStyles = createThemedStyles(theme => ({
    screen: {
        flex: 1,
        width: '100%'
    },
    abandonError: {
        // Inside the panel, where an `InlineNotification` would be a card within a card.
        marginBottom: Spacing.two,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: theme.colors.destructive
    }
}))
