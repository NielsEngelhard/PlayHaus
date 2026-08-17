import type { Lobby } from "@/api/calls/league-of-letters-lobby";
import LoadingPage from "@/components/layout/LoadingPage";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import BackButton from "@/components/ui/BackButton";
import InlineNotification from "@/components/ui/InlineNotification";
import PopupModal from "@/components/ui/PopupModal";
import SelectInput from "@/components/ui/SelectInput";
import TextButton from "@/components/ui/TextButton";
import ValueCard from "@/components/ui/ValueCard";
import { ROUTES } from "@/constants/routes";
import { Colors, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import LobbyCodeCard from "@/features/league-of-letters/components/LobbyCodeCard";
import LobbyPlayerList from "@/features/league-of-letters/components/LobbyPlayerList";
import WordLengthCard from "@/features/league-of-letters/components/WordLengthCard";
import { LANGUAGES } from "@/features/league-of-letters/solo-settings";
import type { LobbyState } from "@/features/league-of-letters/useLobby";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

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

/** A game with one player in it is a solo game with extra steps. */
const MIN_PLAYERS_TO_START = 2;

// Built once: the list never changes, and a fresh array every render would be a new prop
// every render. Same as on the solo settings screen.
const LANGUAGE_OPTIONS = LANGUAGES.map(({ code, label, description }) => ({
    value: code,
    label,
    description
}));

// The cards sit a hair off-square, the way they do everywhere else in this game.
const tilt = (degrees: string) => ({ transform: [{ rotate: degrees }] });

/**
 * The waiting room, for both the player who opened it and the players who joined it.
 *
 * One component rather than two because the difference is small and entirely about
 * permission: the host sees the settings as controls and a Start button, everyone else
 * sees the same settings as values and a line saying who they are waiting on. Splitting
 * it would mean keeping two copies of the code, the player list and the way out in step.
 *
 * The code is the point of the screen and sits at the top of it. Everything below is
 * either a thing to look at while waiting or, for the host, a thing to decide.
 */
export default function LobbyView({ state, onStarted }: Props) {
    const router = useRouter();
    const { user } = useAuth();
    const { lobby, isHost, full, saving, starting, closing } = state;

    /** The confirm panel is up. Leaving is destructive for the host and rude otherwise. */
    const [leaving, setLeaving] = useState(false);

    if (state.error !== null) {
        return (
            <View style={styles.container}>
                <BackButton href={ROUTES.leagueOfLettersIndex} />

                <InlineNotification
                    icon='alert-triangle'
                    color={Colors.light.blush}
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

    const enough = lobby.players.length >= MIN_PLAYERS_TO_START;
    const language = LANGUAGES.find(option => option.code === lobby.settings.locale);

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
        <View style={styles.container}>
            {/*
              * Not a `BackButton`: everywhere else in the app going back is free, and here
              * it throws the room away. A link that does that without asking would be the
              * one link in the app you cannot middle-click safely.
              */}
            <TextButton
                text='Terug'
                variant='neutral'
                onPress={() => setLeaving(true)}
                style={styles.leave}
            />

            <View style={styles.body}>
                <SimpleTextHero
                    title='Kamer'
                    description={isHost
                        ? 'Deel de code, stel het spel in en start zodra iedereen binnen is.'
                        : 'Je zit in de kamer. De host bepaalt de instellingen en start het spel.'}
                />

                <View style={tilt('-0.5deg')}>
                    <LobbyCodeCard
                        code={lobby.code}
                        hint={isHost
                            ? 'Je vrienden vullen deze code in bij "Of join een kamer".'
                            : undefined}
                    />
                </View>

                <LobbyPlayerList
                    players={lobby.players}
                    hostId={lobby.hostId}
                    userId={user?.id}
                />

                {/* The room is full: worth saying out loud, because the empty seats are
                    what the player has been watching and there are none left to watch. */}
                {full && (
                    <InlineNotification
                        icon='users'
                        message='De kamer zit vol. Er kan niemand meer bij.'
                    />
                )}

                {isHost ? (
                    <>
                        <View style={tilt('0.4deg')}>
                            <WordLengthCard
                                value={lobby.settings.wordLength}
                                onChange={wordLength => state.updateSettings({ ...lobby.settings, wordLength })}
                            />
                        </View>

                        <View style={tilt('-0.3deg')}>
                            <SelectInput
                                label='Taal'
                                value={lobby.settings.locale}
                                options={LANGUAGE_OPTIONS}
                                onChange={locale => state.updateSettings({ ...lobby.settings, locale })}
                            />
                        </View>
                    </>
                ) : (
                    // The same two settings, as values. A guest has to know what they are
                    // about to play; they just do not get to change it.
                    <>
                        <ValueCard
                            label='Woordlengte'
                            value={`${lobby.settings.wordLength} letters`}
                            icon='type'
                        />

                        <ValueCard
                            label='Taal'
                            value={language?.label ?? '—'}
                            icon='globe'
                        />
                    </>
                )}

                {state.actionError !== null && (
                    <InlineNotification
                        icon='alert-triangle'
                        color={Colors.light.blush}
                        title='Mislukt'
                        message={state.actionError}
                    />
                )}

                {isHost ? (
                    <TextButton
                        text={starting ? 'Bezig…' : 'Start het spel'}
                        onPress={() => void start()}
                        // A room of one has nobody to play against, and a save in the air
                        // means the game could start on settings that did not stick.
                        disabled={starting || saving || !enough}
                        fullWidth
                        style={styles.start}
                    />
                ) : (
                    <InlineNotification
                        icon='clock'
                        title='Wachten'
                        message='De host start het spel. Blijf op dit scherm.'
                    />
                )}

                {isHost && !enough && (
                    <InlineNotification
                        icon='user-plus'
                        message='Je hebt minstens één medespeler nodig voordat je kunt starten.'
                    />
                )}
            </View>

            {/*
              * The one thing on this screen that cannot be undone, so it is asked rather
              * than done. Dismissable, unlike the solo screen's panel: staying is a
              * perfectly good answer here, and the room behind it still works.
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

const START_BUTTON_HEIGHT = 60;

const styles = StyleSheet.create({
    container: {
        width: '100%'
    },
    // Stands where a `BackButton` would, so the way out is in the place the rest of the
    // app has taught people to look for it.
    leave: {
        marginVertical: Spacing.four
    },
    body: {
        gap: Spacing.four
    },
    start: {
        marginTop: Spacing.two,
        height: START_BUTTON_HEIGHT,
        // This is the one thing the page is for, so it wears the primary fill rather than
        // `TextButton`'s default — same as `Start` on the solo settings screen.
        backgroundColor: Colors.light.primary
    }
})
