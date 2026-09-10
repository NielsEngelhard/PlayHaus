import type { OOULobby } from '@/api/calls/one-of-us-lobby';
import LobbyPageBase from '@/components/layout/LobbyPageBase';
import AppText from '@/components/text/AppText';
import InlineNotification from '@/components/ui/InlineNotification';
import LobbySeatGrid from '@/components/ui/LobbySeatGrid';
import StartGameButton from '@/components/ui/StartGameButton';
import { ONE_OF_US } from '@/constants/games';
import { useAuth } from '@/features/auth/useAuth';
import { useT } from '@/features/i18n/LanguageContext';
import LobbySettingsCard from '@/features/one-of-us/components/multi-device/LobbySettingsCard';
import type { OOULobbyState } from '@/features/one-of-us/useOneOfUsLobby';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useTheme } from '@/features/theme/ThemeContext';
import { View } from 'react-native';

interface Props {
    lobby: OOULobby
    /** Opens the close-the-room confirm. Owned by LobbyView, which also acts on it. */
    onBack: () => void
    onStart: () => void
    /** Everything the room hook returned, plus the room itself, already known to exist. */
    state: OOULobbyState
}

// The room, on the screen of whoever opened it.
export default function HostLobby({ lobby, onBack, onStart, state }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const { user } = useAuth();

    const enough = lobby.players.length >= lobby.minPlayers;

    return (
        <LobbyPageBase
            game={ONE_OF_US}
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
                        text={state.starting ? t('common.busy') : t('oneOfUs.multiDevice.lobby.start')}
                        onPress={onStart}
                        // A save still in the air means the game could start on settings that did not stick.
                        disabled={state.starting || state.saving || !enough}
                    />

                    <AppText style={styles.footnote}>
                        {enough
                            ? t('oneOfUs.multiDevice.lobby.startNote')
                            : t('oneOfUs.multiDevice.lobby.needPlayers', { min: lobby.minPlayers })}
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
                accent={ONE_OF_US.color}
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
