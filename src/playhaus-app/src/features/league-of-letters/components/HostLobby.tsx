import type { Lobby } from "@/api/calls/league-of-letters-lobby";
import AppText from "@/components/text/AppText";
import InlineNotification from "@/components/ui/InlineNotification";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import LobbyBar from "@/features/league-of-letters/components/LobbyBar";
import LobbyCodeHero from "@/features/league-of-letters/components/LobbyCodeHero";
import LobbyPlayerGrid from "@/features/league-of-letters/components/LobbyPlayerGrid";
import LobbySettingsCard from "@/features/league-of-letters/components/LobbySettingsCard";
import StartGameButton from "@/features/league-of-letters/components/StartGameButton";
import type { LobbyState } from "@/features/league-of-letters/useLobby";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { ScrollView, View } from "react-native";

interface Props {
    /** Everything `useLobby` returned, plus the room itself, already known to exist. */
    state: LobbyState,
    lobby: Lobby,
    /** Opens the close-the-room confirm. Owned by `LobbyView`, which also acts on it. */
    onBack: () => void,
    onStart: () => void
}

/** A game with one player in it is a solo game with extra steps. */
const MIN_PLAYERS_TO_START = 2;

/**
 * The room, on the screen of whoever opened it.
 *
 * Three fixed things and one that scrolls. The bar stays because it holds the way out; the
 * start button stays because it is what the screen is for and it must not be somewhere
 * below the fold when the last player arrives. Everything in between — the code, the
 * seats, the settings — moves, because on a short phone with six seats drawn it has to.
 */
export default function HostLobby({ state, lobby, onBack, onStart }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const { user } = useAuth();

    const enough = lobby.players.length >= MIN_PLAYERS_TO_START;

    return (
        <View style={styles.screen}>
            <LobbyBar
                onBack={onBack}
                isHost
                code={lobby.code}
                live={state.connection === 'open'}
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <LobbyCodeHero code={lobby.code} />

                <LobbyPlayerGrid
                    players={lobby.players}
                    hostId={lobby.hostId}
                    userId={user?.id}
                    online={state.online}
                />

                <LobbySettingsCard
                    settings={lobby.settings}
                    onChange={state.updateSettings}
                />

                {state.actionError !== null && (
                    <InlineNotification
                        icon='alert-triangle'
                        color={theme.colors.blush}
                        title='Mislukt'
                        message={state.actionError}
                    />
                )}
            </ScrollView>

            <View style={styles.footer}>
                <StartGameButton
                    text={state.starting ? 'Bezig…' : 'Start het spel'}
                    onPress={onStart}
                    // A room of one has nobody to play against, and a save still in the air
                    // means the game could start on settings that did not stick.
                    disabled={state.starting || state.saving || !enough}
                />

                {/*
                  * The design promised latecomers could still join after the first round.
                  * They cannot: the backend refuses a join once a lobby has started, so
                  * this says the true thing instead — which is also the more useful one,
                  * since it is the last moment anybody can be added.
                  */}
                <AppText style={styles.footnote}>
                    {enough
                        ? 'Zodra je start kan er niemand meer bij.'
                        : 'Je hebt minstens één medespeler nodig.'}
                </AppText>
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // Fills the viewport this page claimed, which is what lets the bar and the button
    // stay put while the middle scrolls between them.
    screen: {
        flex: 1,
        width: '100%'
    },
    scroll: {
        width: '100%'
    },
    content: {
        gap: 18,
        // Clears the shadows the cards throw downwards, which paint outside their own box
        // and would otherwise be cropped by the scroller's bottom edge.
        paddingBottom: Spacing.three
    },
    footer: {
        flexShrink: 0,
        paddingTop: Spacing.two
    },
    footnote: {
        marginTop: 10,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 600,
        color: theme.colors.textMuted
    }
}))
