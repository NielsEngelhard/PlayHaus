import type { FFLobby } from "@/api/calls/fake-filler-lobby";
import LobbyPageBase from "@/components/layout/LobbyPageBase";
import AppText from "@/components/text/AppText";
import InlineNotification from "@/components/ui/InlineNotification";
import LobbySeatGrid from "@/components/ui/LobbySeatGrid";
import StartGameButton from "@/components/ui/StartGameButton";
import { FAKE_FILLER } from "@/constants/games";
import { useAuth } from "@/features/auth/useAuth";
import LobbySettingsCard from "@/features/fake-filler/components/LobbySettingsCard";
import type { FFLobbyState } from "@/features/fake-filler/useLobby";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { View } from "react-native";

interface Props {
    /** Everything `useLobby` returned, plus the room itself, already known to exist. */
    state: FFLobbyState,
    lobby: FFLobby,
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

    const enough = lobby.players.length >= lobby.minPlayers;

    return (
        <LobbyPageBase
            game={FAKE_FILLER}
            title={t('lobby.yourRoom')}
            live={state.connection === 'open'}
            onBack={onBack}
            backLabel={t('lobby.close')}
            code={lobby.code}
            // The host's screen is the one with something to offer, so it gets the band as well as the pill.
            handsOutCode
            footer={
                <View>
                    <StartGameButton
                        text={state.starting ? t('common.busy') : t('fakeFiller.lobby.start')}
                        onPress={onStart}
                        // A save still in the air means the game could start on settings that did not stick.
                        disabled={state.starting || state.saving || !enough}
                    />

                    <AppText style={styles.footnote}>
                        {enough
                            ? t('fakeFiller.lobby.startNote')
                            : t('fakeFiller.lobby.needPlayers', { min: lobby.minPlayers })}
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
                accent={FAKE_FILLER.color}
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
