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

/**
 * Opening a multiplayer room — after checking there is not already one open.
 *
 * The check is the whole of this screen, and it has to happen here rather than inside
 * `OpenRoom` because of what that component does the moment it mounts: `useLobby`
 * creates the room, immediately, so there is a code to share before the host has been
 * asked anything. A host who still has a room open — or a game being played in one —
 * would otherwise be handed a second one, with the first left standing behind it and
 * the people in it waiting on somebody who is now somewhere else.
 *
 * Same question the solo settings screen asks for the same reason, and answered the
 * same two ways: go back to it, or throw it away and open a new one.
 */
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

    // Nothing may touch state after unmount — both ways out of the panel below navigate
    // away while the request that caused it may still be settling.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    // Only a signed-in session has a room to find; while the session is being restored
    // there is nothing to ask about yet.
    const signedIn = status === 'signedIn';

    useEffect(() => {
        if (!signedIn) return;

        // Asking on mount and acting on the answer is the whole job. Every state change
        // happens after the `await`, never on the way in — the same shape as the solo
        // settings screen's check and as `useLobby`'s own load.
        void (async () => {
            // The screen this one replaced hands its room back on the way out, and it
            // cannot await that — it is already gone. Waiting for it here is the other
            // half: without this, a host stepping off `/room` and straight back on would
            // race their own delete and be asked about the room they just closed.
            await settleGiveBacks();
            if (!mounted.current) return;

            let found: Lobby | null = null;
            try {
                found = await getCurrentLobby();
            } catch {
                // The check failing is not worth stopping on: a room still opens below,
                // which is what would have happened before this screen ever asked.
            }

            if (!mounted.current) return;

            setRunning(found);
            setChecked(true);
        })();
    }, [signedIn]);

    /** Back to the room they left, board and all. */
    function resume(lobby: Lobby) {
        // `replace`, not `push`: this screen would send the host straight back to the
        // room they just came from, so it must not be behind it.
        router.replace(ROUTES.leagueOfLettersRoom(lobby.code) as RelativePathString);
    }

    /**
     * Throw the room away — and the game in it, if it got that far — and stay here. What
     * is left behind the closing panel is `OpenRoom`, which opens a fresh one.
     */
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

            // Kept open on failure. Closing it would open a second room on top of the one
            // that just failed to close, with nothing on screen saying so.
            setAbandonError(lobbyErrorMessage(failure));
        } finally {
            if (mounted.current) setAbandoning(false);
        }
    }

    // Held back until the answer is in. `OpenRoom` creates a lobby as soon as it is
    // mounted, so mounting it before the answer would be the very thing this asks about.
    if (!checked) {
        return <LoadingPage message={t('lol.lobby.loading')} />;
    }

    if (running !== null) {
        // A lobby that has started is a game with people sitting at it; one that has not is
        // a door standing open. Worth saying which, because the two cost different things
        // to throw away.
        const playing = running.status === 'started';

        return (
            // Nothing behind the panel: the lobby this screen exists to open is exactly what
            // must not be made until the question is answered. So the way out is on the
            // panel too, unlike the solo screen, where the form behind it is still a page
            // you can be on.
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

/**
 * The room itself.
 *
 * Its own component rather than the body of the page, because `useLobby` opens a room
 * the moment it is called and a hook cannot be called for one branch and not another.
 * Mounting this *is* creating the room.
 *
 * The room exists from here on: that is why leaving matters — it is given back when this
 * screen goes, which `useLobby` takes care of and the way out on `LobbyView` asks about
 * first. The one exit that keeps it is starting the game, which is `onStarted`.
 */
function OpenRoom() {
    const router = useRouter();

    // No code: this player is opening a room rather than joining one, which makes them
    // its host.
    const state = useLobby();

    return (
        <LobbyView
            state={state}
            // `replace`, not `push`: the lobby this screen was is gone the moment the
            // game starts, and going back to it would open a second empty room.
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
        // The panel is already the thing being looked at, so the line only has to be
        // readable and the wrong colour for good news.
        marginBottom: Spacing.two,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: theme.colors.destructive
    }
}))
