import { minPlayersFor, type Lobby } from "@/api/calls/league-of-letters-lobby";
import LobbyPageBase from "@/components/layout/LobbyPageBase";
import AppText from "@/components/text/AppText";
import InlineNotification from "@/components/ui/InlineNotification";
import LobbySeatGrid from "@/components/ui/LobbySeatGrid";
import StartGameButton from "@/components/ui/StartGameButton";
import { LEAGUE_OF_LETTERS } from "@/constants/games";
import { useAuth } from "@/features/auth/useAuth";
import InviteFriendModal from "@/features/friends/components/InviteFriendModal";
import { useT } from "@/features/i18n/LanguageContext";
import LobbySettingsCard from "@/features/league-of-letters/components/LobbySettingsCard";
import type { LobbyState } from "@/features/league-of-letters/useLobby";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useState } from "react";
import { View } from "react-native";

interface Props {
    /** Everything `useLobby` returned, plus the room itself, already known to exist. */
    state: LobbyState,
    lobby: Lobby,
    /** Opens the close-the-room confirm. Owned by `LobbyView`, which also acts on it. */
    onBack: () => void,
    onStart: () => void
}

// The room, on the screen of whoever opened it.
export default function HostLobby({ state, lobby, onBack, onStart }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const { user } = useAuth();

    const [inviting, setInviting] = useState(false);

    const tournament = lobby.kind === 'tournament';
    const enough = lobby.players.length >= minPlayersFor(lobby.kind);

    return (
        <LobbyPageBase
            game={LEAGUE_OF_LETTERS}
            title={tournament ? t('lol.tournament.yourTournament') : t('lobby.yourRoom')}
            live={state.connection === 'open'}
            onBack={onBack}
            backLabel={t('lobby.close')}
            code={lobby.code}
            // The host's screen is the one with something to offer, so it gets the band as well as the pill.
            handsOutCode
            footer={
                <View>
                    <StartGameButton
                        text={state.starting
                            ? t('common.busy')
                            : tournament ? t('lol.tournament.start') : t('lol.lobby.start')}
                        onPress={onStart}
                        // A room of one has nobody to play against.
                        disabled={state.starting || state.saving || !enough}
                    />

                    {/* The design promised latecomers could still join after the first round. */}
                    <AppText style={styles.footnote}>
                        {tournament
                            ? enough ? t('lol.tournament.startNote') : t('lol.tournament.needPlayers')
                            : enough ? t('lol.lobby.startNote') : t('lol.lobby.needPlayers')}
                    </AppText>
                </View>
            }
        >
            <LobbySeatGrid
                players={lobby.players}
                maxPlayers={lobby.maxPlayers}
                hostId={lobby.hostId}
                userId={user?.id}
                online={state.online}
                accent={LEAGUE_OF_LETTERS.color}
                onInvite={() => setInviting(true)}
            />

            <LobbySettingsCard
                settings={lobby.settings}
                onChange={state.updateSettings}
            />

            {state.actionError !== null && (
                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title={t('common.failed')}
                    message={t(state.actionError)}
                />
            )}
            <InviteFriendModal
                visible={inviting}
                onClose={() => setInviting(false)}
                code={lobby.code}
                seated={new Set(lobby.players.map(player => player.userId))}
            />
        </LobbyPageBase>
    )
}

const useStyles = createThemedStyles(theme => ({
    footnote: {
        marginTop: 10,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 600,
        color: theme.colors.textMuted
    }
}))
