import type { Lobby } from "@/api/calls/league-of-letters-lobby";
import { useFullScreen } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import BackButton from "@/components/ui/BackButton";
import InlineNotification from "@/components/ui/InlineNotification";
import PopupModal from "@/components/ui/PopupModal";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import GuestLobby from "@/features/league-of-letters/components/GuestLobby";
import HostLobby from "@/features/league-of-letters/components/HostLobby";
import type { LobbyState } from "@/features/league-of-letters/useLobby";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

interface Props {
    /** Everything `useLobby` returned. The screen drives the room entirely through it. */
    state: LobbyState,
    /**
     * The host started the game. The room screens differ in where that leads — the host
     * is on `/room` and has to travel to the code, a guest is already there — so it is
     * the caller's to answer.
     */
    onStarted: (lobby: Lobby) => void
}

/**
 * The waiting room: everything both people in it have in common, and then which of the
 * two screens they get.
 *
 * The host and the guest used to be one component branching on `isHost`, on the grounds
 * that the difference was only permission. It is not: a host is setting something up and
 * a guest is waiting for something to happen, and those want opposite screens — one is a
 * code, a roster and a big green light, the other is a held breath. So this keeps what is
 * genuinely shared (the three states where there is no room to show, and the question
 * asked on the way out) and hands the room itself to `HostLobby` or `GuestLobby`.
 *
 * The page claims the whole viewport. Both halves pin something top and bottom, and inside
 * the root layout's shared scroller there is nothing for a page to pin against.
 */
export default function LobbyView({ state, onStarted }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const router = useRouter();
    const { lobby, isHost, closing } = state;

    // Claimed before the early returns below, because a hook cannot be called for one
    // branch and not another. The waiting and failed states are the same page as the room
    // — they just have less on them.
    useFullScreen();

    /** The confirm panel is up. Leaving is destructive for the host and rude otherwise. */
    const [leaving, setLeaving] = useState(false);

    // The host shut the room while this player was sitting in it. The code no longer
    // works, so there is nothing to offer but the way out -- a retry would only find
    // the same 404.
    if (state.closed) {
        return (
            <View style={styles.screen}>
                <BackButton href={ROUTES.leagueOfLettersIndex} />

                <InlineNotification
                    icon='x'
                    color={theme.colors.blush}
                    title='Kamer gesloten'
                    message='De host heeft de kamer gesloten. Vraag om een nieuwe code.'
                >
                    <TextButton
                        text='Terug naar de spellen'
                        onPress={() => router.replace(ROUTES.leagueOfLettersIndex)}
                    />
                </InlineNotification>
            </View>
        )
    }

    if (state.error !== null) {
        return (
            <View style={styles.screen}>
                <BackButton href={ROUTES.leagueOfLettersIndex} />

                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title='Geen kamer'
                    message={state.error}
                >
                    <TextButton text='Opnieuw' onPress={state.reload} />
                </InlineNotification>
            </View>
        )
    }

    if (lobby === null) {
        return <LoadingPage message='Kamer openen…' />;
    }

    /** Hand the room back, then go. Both halves matter, so the modal waits for the first. */
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

            {/*
              * The one thing on this screen that cannot be undone, so it is asked rather
              * than done. Both screens' back chips lead here — which is the reason they
              * are buttons and the global header is switched off for these routes.
              *
              * Dismissable, unlike the solo screen's panel: staying is a perfectly good
              * answer here, and the room behind it still works.
              */}
            <PopupModal
                visible={leaving}
                title={isHost ? 'Kamer sluiten?' : 'Kamer verlaten?'}
                message={isHost
                    ? 'De kamer wordt verwijderd en de code werkt niet meer. Iedereen die al binnen is, vliegt eruit.'
                    : 'Je gaat terug naar het spelmenu. Je kunt later opnieuw joinen met dezelfde code.'}
                onRequestClose={() => setLeaving(false)}
            >
                <TextButton
                    text={closing ? 'Bezig…' : isHost ? 'Sluiten' : 'Verlaten'}
                    variant='primary'
                    fullWidth
                    disabled={closing}
                    onPress={() => void leave()}
                />

                <TextButton
                    text='Blijf hier'
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
    // Fills the height the root layout leaves, which the two room screens divide up
    // between their own pinned rows and the scroller between them.
    screen: {
        flex: 1,
        width: '100%'
    }
}))
