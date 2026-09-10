import type { OOULobby } from '@/api/calls/one-of-us-lobby';
import LobbyPageBase from '@/components/layout/LobbyPageBase';
import InlineNotification from '@/components/ui/InlineNotification';
import LobbyRoster from '@/components/ui/LobbyRoster';
import RoomCodeFooter from '@/components/ui/RoomCodeFooter';
import WaitingForHost from '@/components/ui/WaitingForHost';
import { ONE_OF_US } from '@/constants/games';
import { useAuth } from '@/features/auth/useAuth';
import { useT } from '@/features/i18n/LanguageContext';
import type { OOULobbyState } from '@/features/one-of-us/useOneOfUsLobby';
import { useTheme } from '@/features/theme/ThemeContext';

interface Props {
    lobby: OOULobby
    /** Opens the leave-the-room confirm. Owned by LobbyView, which acts on it. */
    onBack: () => void
    state: OOULobbyState
}

// The room, on the screen of somebody who joined it.
export default function GuestLobby({ lobby, onBack, state }: Props) {
    const t = useT();
    const theme = useTheme();

    const { user } = useAuth();

    // The host is always the first player, but read by id rather than by position.
    const host = lobby.players.find(player => player.userId === lobby.hostId);

    return (
        <LobbyPageBase
            game={ONE_OF_US}
            title={t('lobby.named', { code: lobby.code })}
            // No handsOutCode: a guest gets the code in the bar, to pass on or to read back, but not the band.
            code={lobby.code}
            live={state.connection === 'open'}
            onBack={onBack}
            backLabel={t('lobby.leave')}
            minPlayers={lobby.minPlayers}
            // Pinned like the host's start button and for the same reason: it is the one thing anybody here can do.
            footer={<RoomCodeFooter code={lobby.code} />}
        >
            <WaitingForHost
                game={ONE_OF_US}
                hostName={host?.name ?? t('oneOfUs.multiDevice.lobby.hostFallback')}
            />

            <LobbyRoster
                players={lobby.players}
                maxPlayers={lobby.maxPlayers}
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
        </LobbyPageBase>
    )
}
