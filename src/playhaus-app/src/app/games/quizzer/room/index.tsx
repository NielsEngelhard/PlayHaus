import { deletePQLobby, getCurrentPQLobby, type PQLobby } from "@/api/calls/pubquizr-lobby";
import LoadingPage from "@/components/layout/LoadingPage";
import AppText from "@/components/text/AppText";
import PopupModal from "@/components/ui/PopupModal";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { FontSizes, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import { useT } from "@/features/i18n/LanguageContext";
import type { TranslationKey } from "@/features/i18n/keys";
import QuizLobbyView from "@/features/pubquizr/components/room/QuizLobbyView";
import { pqLobbyErrorMessage } from "@/features/pubquizr/multi-device/pubquizr-lobby-errors";
import { useQuizLobby } from "@/features/pubquizr/multi-device/useQuizLobby";
import { settleGiveBacks } from "@/features/realtime/room-holds";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { RelativePathString, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

// Opening a room — after checking there is not already one open.
export default function QuizzerCreateRoomPage() {
    const router = useRouter();
    const styles = useStyles();
    const t = useT();

    const { status } = useAuth();

    /** False until the server has said whether there is already a room. */
    const [checked, setChecked] = useState(false);
    /** The room that was already open, until the host has said what to do with it. */
    const [running, setRunning] = useState<PQLobby | null>(null);
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

            let found: PQLobby | null = null;
            try {
                found = await getCurrentPQLobby();
            } catch {
                // The check failing is not worth stopping on.
            }

            if (!mounted.current) return;

            setRunning(found);
            setChecked(true);
        })();
    }, [signedIn]);

    /** Back to the room they left, evening and all. */
    function resume(lobby: PQLobby) {
        // `replace`, not `push`: this screen would send the host straight back to the room they just came from.
        router.replace(ROUTES.quizzerRoom(lobby.code) as RelativePathString);
    }

    // Throw the room away — and the quiz in it, if it got that far — and stay here.
    async function abandon(lobby: PQLobby) {
        if (abandoning) return;

        setAbandoning(true);
        setAbandonError(null);

        try {
            await deletePQLobby(lobby.code);
            if (!mounted.current) return;

            setRunning(null);
        } catch (failure) {
            if (!mounted.current) return;

            // Kept open on failure.
            setAbandonError(pqLobbyErrorMessage(failure));
        } finally {
            if (mounted.current) setAbandoning(false);
        }
    }

    // Held back until the answer is in.
    if (!checked) {
        return <LoadingPage message={t('pubquizr.lobby.loading')} />;
    }

    if (running !== null) {
        // A room that has started is an evening with people sitting at it; one that has not is a door standing open.
        const playing = running.status === 'started';

        return (
            // Nothing behind the panel: the room this screen exists to open is exactly what must not be made until the question is answered.
            <View style={styles.screen}>
                <PopupModal
                    visible
                    title={playing
                        ? t('pubquizr.lobby.running.quizTitle')
                        : t('pubquizr.lobby.running.lobbyTitle')}
                    message={playing
                        ? t('pubquizr.lobby.running.quizMessage', { code: running.code })
                        : t('pubquizr.lobby.running.lobbyMessage', { code: running.code })}
                >
                    {abandonError !== null && (
                        <AppText style={styles.abandonError}>{t(abandonError)}</AppText>
                    )}

                    <TextButton
                        text={playing
                            ? t('pubquizr.lobby.running.resumeQuiz')
                            : t('pubquizr.lobby.running.resumeLobby')}
                        variant='primary'
                        fullWidth
                        disabled={abandoning}
                        onPress={() => resume(running)}
                    />

                    <TextButton
                        text={abandoning
                            ? t('common.busy')
                            : playing
                                ? t('pubquizr.lobby.running.stopQuiz')
                                : t('pubquizr.lobby.running.closeLobby')}
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
                        onPress={() => router.replace(ROUTES.quizzerIndex)}
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
    const state = useQuizLobby();

    return (
        <QuizLobbyView
            state={state}
            // `replace`, not `push`: the room this screen was is gone the moment the evening is dealt.
            onStarted={lobby => router.replace(
                ROUTES.quizzerRoom(lobby.code) as RelativePathString
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
