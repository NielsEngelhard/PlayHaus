import type { WWLobby } from "@/api/calls/witty-wars-lobby";
import LobbyPageBase from "@/components/layout/LobbyPageBase";
import AppText from "@/components/text/AppText";
import InlineNotification from "@/components/ui/InlineNotification";
import LobbyPlayersCard from "@/components/ui/LobbyPlayersCard";
import StartGameButton from "@/components/ui/StartGameButton";
import { WITTY_WARS } from "@/constants/games";
import { useAuth } from "@/features/auth/useAuth";
import LobbySettingsCard from "@/features/witty-wars/components/LobbySettingsCard";
import type { WWLobbyState } from "@/features/witty-wars/useLobby";
import InviteFriendModal from "@/features/friends/components/InviteFriendModal";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useState } from "react";
import { View } from "react-native";

interface Props {
    /** Everything `useLobby` returned, plus the room itself, already known to exist. */
    state: WWLobbyState,
    lobby: WWLobby,
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

    const enough = lobby.players.length >= lobby.minPlayers;

    return (
        <LobbyPageBase
            game={WITTY_WARS}
            title={t('lobby.yourRoom')}
            live={state.connection === 'open'}
            onBack={onBack}
            backLabel={t('lobby.close')}
            code={lobby.code}
            // The host's screen is the one with something to offer, so it gets the band as well as the pill.
            handsOutCode
            minPlayers={lobby.minPlayers}
            footer={
                <View>
                    <StartGameButton
                        text={state.starting ? t('common.busy') : t('wittyWars.lobby.start')}
                        onPress={onStart}
                        // A save still in the air means the game could start on settings that did not stick.
                        disabled={state.starting || state.saving || !enough}
                    />

                    <AppText style={styles.footnote}>
                        {enough
                            ? t('wittyWars.lobby.startNote')
                            : t('wittyWars.lobby.needPlayers', { min: lobby.minPlayers })}
                    </AppText>
                </View>
            }
        >
            <LobbyPlayersCard
                players={lobby.players}
                maxPlayers={lobby.maxPlayers}
                minPlayers={lobby.minPlayers}
                hostId={lobby.hostId}
                userId={user?.id}
                online={state.online}
                onInvite={() => setInviting(true)}
            />

            <LobbySettingsCard
                maxAnswersPerPlayer={lobby.maxAnswersPerPlayer}
                minAnswersPerPlayer={lobby.minAnswersPerPlayer}
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
