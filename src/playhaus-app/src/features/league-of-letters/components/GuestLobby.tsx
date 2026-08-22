import type { Lobby } from "@/api/calls/league-of-letters-lobby";
import InlineNotification from "@/components/ui/InlineNotification";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import LobbyBar from "@/features/league-of-letters/components/LobbyBar";
import LobbyRoster from "@/features/league-of-letters/components/LobbyRoster";
import RoomCodeFooter from "@/features/league-of-letters/components/RoomCodeFooter";
import WaitingForHost from "@/features/league-of-letters/components/WaitingForHost";
import type { LobbyState } from "@/features/league-of-letters/useLobby";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useT } from "@/features/i18n/LanguageContext";
import { ScrollView, View } from "react-native";

interface Props {
    state: LobbyState,
    lobby: Lobby,
    /** Opens the leave-the-room confirm. Owned by `LobbyView`, which also acts on it. */
    onBack: () => void
}

/**
 * The room, on the screen of somebody who joined it.
 *
 * Deliberately not the host's screen with the controls greyed out. A guest decides
 * nothing here — not the word length, not the language, not when it starts — so showing
 * them the knobs, even as values, would be showing them a form they cannot fill in. What
 * they get instead is the one thing they can act on (the code, to pass on) and the one
 * thing they need to know (that the room is still there, and who they are waiting for).
 */
export default function GuestLobby({ state, lobby, onBack }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const { user } = useAuth();

    // The host is always the first player, but read by id rather than by position: the
    // guarantee lives in the backend, and this screen puts their name in a sentence.
    const host = lobby.players.find(player => player.userId === lobby.hostId);

    return (
        <View style={styles.screen}>
            <LobbyBar
                onBack={onBack}
                isHost={false}
                code={lobby.code}
                live={state.connection === 'open'}
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <WaitingForHost hostName={host?.name ?? t('lol.lobby.hostFallback')} />

                <LobbyRoster
                    players={lobby.players}
                    hostId={lobby.hostId}
                    userId={user?.id}
                />

                {state.actionError !== null && (
                    <InlineNotification
                        icon='alert-triangle'
                        color={theme.colors.blush}
                        title={t('common.failed')}
                        message={t(state.actionError)}
                    />
                )}
            </ScrollView>

            {/* Pinned, like the host's start button and for the same reason: it is the one
                thing on the page anybody can actually do. */}
            <RoomCodeFooter code={lobby.code} />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    screen: {
        flex: 1,
        width: '100%'
    },
    scroll: {
        width: '100%'
    },
    content: {
        gap: 30,
        paddingTop: Spacing.three,
        // Clears the shadows the rows throw downwards, which paint outside their own box
        // and would otherwise be cropped by the scroller's bottom edge.
        paddingBottom: Spacing.three
    }
}))
