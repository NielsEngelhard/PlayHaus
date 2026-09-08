import { abandonLobby, getCurrentLobby, type Lobby } from "@/api/calls/league-of-letters-lobby";
import LoadingPage from "@/components/layout/LoadingPage";
import AppText from "@/components/text/AppText";
import PopupModal from "@/components/ui/PopupModal";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { FontSizes, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import LobbyView from "@/features/league-of-letters/components/LobbyView";
import { lobbyErrorMessage } from "@/features/league-of-letters/game-errors";
import { settleGiveBacks, useLobby } from "@/features/league-of-letters/useLobby";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import { RelativePathString, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

// Opening a multiplayer room — after checking there is not already one open.
export default function LeagueOfLettersCreateRoomPage() {
    const router = useRouter();
    const styles = useStyles();
    const t = useT();

    const { status } = useAuth();

    /** False until the server has said whether there is already a room. */
    const [checked, setChecked] = useState(false);
    /** The room that was already open, until the host has said what to do with it. */
    const [running, setRunning] = useState<Lobby | null>(null);
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
            await settleGiveBacks();
            if (!mounted.current) return;

            let found: Lobby | null = null;
            try {
                found = await getCurrentLobby();
            } catch {
                // The check failing is not worth stopping on.
            }

            if (!mounted.current) return;

            setRunning(found);
            setChecked(true);
        })();
    }, [signedIn]);

    /** Back to the room they left, board and all. */
    function resume(lobby: Lobby) {
        // `replace`, not `push`: this screen would send the host straight back to the room they just came from.
        router.replace(ROUTES.leagueOfLettersRoom(lobby.code) as RelativePathString);
    }

    // Throw the room away — and the game in it, if it got that far — and stay here.
    async function abandon(lobby: Lobby) {
        if (abandoning) return;

        setAbandoning(true);
        setAbandonError(null);

        try {
            await abandonLobby(lobby.code);
            if (!mounted.current) return;

            setRunning(null);
        } catch (failure) {
            if (!mounted.current) return;

            // Kept open on failure.
            setAbandonError(lobbyErrorMessage(failure));
        } finally {
            if (mounted.current) setAbandoning(false);
        }
    }

    // Held back until the answer is in.
    if (!checked) {
        return <LoadingPage message={t('lol.lobby.loading')} />;
    }

    if (running !== null) {
        // A lobby that has started is a game with people sitting at it; one that has not is a door standing open.
        const playing = running.status === 'started';

        return (
            // Nothing behind the panel: the lobby this screen exists to open is exactly what must not be made until the question is answered.
            <View style={styles.screen}>
                <PopupModal
                    visible
                    title={playing ? t('lol.lobby.running.gameTitle') : t('lol.lobby.running.lobbyTitle')}
                    message={playing
                        ? t('lol.lobby.running.gameMessage', { code: running.code })
                        : t('lol.lobby.running.lobbyMessage', { code: running.code })}
                >
                    {abandonError && (
                        <AppText style={styles.abandonError}>{t(abandonError)}</AppText>
                    )}

                    <TextButton
                        text={playing ? t('lol.lobby.running.resumeGame') : t('lol.lobby.running.resumeLobby')}
                        variant='primary'
                        fullWidth
                        disabled={abandoning}
                        onPress={() => resume(running)}
                    />

                    <TextButton
                        text={abandoning ? t('common.busy') : playing ? t('lol.lobby.running.stopGame') : t('lol.lobby.running.closeLobby')}
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
                        onPress={() => router.replace(ROUTES.leagueOfLettersIndex)}
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
    const state = useLobby();

    return (
        <LobbyView
            state={state}
            // `replace`, not `push`: the lobby this screen was is gone the moment the game starts.
            onStarted={lobby => router.replace(
                ROUTES.leagueOfLettersRoom(lobby.code) as RelativePathString
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
