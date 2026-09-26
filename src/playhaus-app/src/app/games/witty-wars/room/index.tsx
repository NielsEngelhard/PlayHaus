import { abandonWWLobby, getCurrentWWLobby, isWWGameMode, type WWGameMode, type WWLobby } from "@/api/calls/witty-wars-lobby";
import LoadingPage from "@/components/layout/LoadingPage";
import AppText from "@/components/text/AppText";
import PopupModal from "@/components/ui/PopupModal";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { FontSizes } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import LobbyView from "@/features/witty-wars/components/LobbyView";
import { wwLobbyErrorMessage } from "@/features/witty-wars/witty-wars-errors";
import { settleWWGiveBacks, useLobby } from "@/features/witty-wars/useLobby";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { RelativePathString, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

// Opening a room — after checking there is not already one open.
export default function WittyWarsCreateRoomPage() {
    const router = useRouter();
    const styles = useStyles();
    const t = useT();

    const { status } = useAuth();

    // The mode card the host came in through; anything else opens on the server's default.
    const { mode } = useLocalSearchParams<{ mode?: string }>();
    const gameMode = isWWGameMode(mode) ? mode : undefined;

    /** False until the server has said whether there is already a room. */
    const [checked, setChecked] = useState(false);
    /** The room that was already open, until the host has said what to do with it. */
    const [running, setRunning] = useState<WWLobby | null>(null);
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

        // Asking on mount and acting on the answer is the whole job.
        void (async () => {
            // The screen this one replaced hands its room back on the way out, and it cannot await that — it is already gone.
            await settleWWGiveBacks();
            if (!mounted.current) return;

            let found: WWLobby | null = null;
            try {
                found = await getCurrentWWLobby();
            } catch {
                // The check failing is not worth stopping on.
            }

            if (!mounted.current) return;

            setRunning(found);
            setChecked(true);
        })();
    }, [signedIn]);

    /** Back to the room they left, board and all. */
    function resume(lobby: WWLobby) {
        // `replace`, not `push`: this screen would send the host straight back to the room they just came from.
        router.replace(ROUTES.wittyWarsRoom(lobby.code) as RelativePathString);
    }

    // Throw the room away — and the game in it, if it got that far — and stay here.
    async function abandon(lobby: WWLobby) {
        if (abandoning) return;

        setAbandoning(true);
        setAbandonError(null);

        try {
            await abandonWWLobby(lobby.code);
            if (!mounted.current) return;

            setRunning(null);
        } catch (failure) {
            if (!mounted.current) return;

            // Kept open on failure.
            setAbandonError(wwLobbyErrorMessage(failure));
        } finally {
            if (mounted.current) setAbandoning(false);
        }
    }

    // Held back until the answer is in.
    if (!checked) {
        return <LoadingPage message={t('wittyWars.lobby.loading')} />;
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
                        ? t('wittyWars.lobby.running.gameTitle')
                        : t('wittyWars.lobby.running.lobbyTitle')}
                    message={playing
                        ? t('wittyWars.lobby.running.gameMessage', { code: running.code })
                        : t('wittyWars.lobby.running.lobbyMessage', { code: running.code })}
                    tone='danger'
                    actions={<>
                        <TextButton
                            text={playing
                                ? t('wittyWars.lobby.running.resumeGame')
                                : t('wittyWars.lobby.running.resumeLobby')}
                            variant='primary'
                            fullWidth
                            disabled={abandoning}
                            onPress={() => resume(running)}
                        />

                        <TextButton
                            text={abandoning
                                ? t('common.busy')
                                : playing
                                    ? t('wittyWars.lobby.running.stopGame')
                                    : t('wittyWars.lobby.running.closeLobby')}
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
                            onPress={() => router.replace(ROUTES.wittyWarsIndex)}
                        />
                    </>}
                >
                    {abandonError && (
                        <AppText style={styles.abandonError}>{t(abandonError)}</AppText>
                    )}
                </PopupModal>
            </View>
        )
    }

    return <OpenRoom gameMode={gameMode} />;
}

// The room itself.
function OpenRoom({ gameMode }: { gameMode?: WWGameMode }) {
    const router = useRouter();

    // No code: this player is opening a room rather than joining one, which makes them its host.
    const state = useLobby(undefined, gameMode);

    return (
        <LobbyView
            state={state}
            // `replace`, not `push`: the room this screen was is gone the moment the game starts.
            onStarted={lobby => router.replace(
                ROUTES.wittyWarsRoom(lobby.code) as RelativePathString
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
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: theme.colors.destructive
    }
}))
