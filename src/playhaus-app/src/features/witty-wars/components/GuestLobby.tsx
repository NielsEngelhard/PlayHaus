import type { WWLobby } from "@/api/calls/witty-wars-lobby";
import LobbyPageBase from "@/components/layout/LobbyPageBase";
import InlineNotification from "@/components/ui/InlineNotification";
import LobbyPlayersCard from "@/components/ui/LobbyPlayersCard";
import RoomCodeFooter from "@/components/ui/RoomCodeFooter";
import WaitingForHost from "@/components/ui/WaitingForHost";
import { WITTY_WARS } from "@/constants/games";
import { useAuth } from "@/features/auth/useAuth";
import type { WWLobbyState } from "@/features/witty-wars/useLobby";
import { useT } from "@/features/i18n/LanguageContext";
import { useTheme } from "@/features/theme/ThemeContext";

interface Props {
    state: WWLobbyState,
    lobby: WWLobby,
    /** Opens the leave-the-room confirm. Owned by `LobbyView`, which acts on it. */
    onBack: () => void
}

// The room, on the screen of somebody who joined it.
export default function GuestLobby({ state, lobby, onBack }: Props) {
    const t = useT();
    const theme = useTheme();

    const { user } = useAuth();

    // The host is always the first player, but read by id rather than by position.
    const host = lobby.players.find(player => player.userId === lobby.hostId);

    return (
        <LobbyPageBase
            game={WITTY_WARS}
            title={t('lobby.named', { code: lobby.code })}
            // No `handsOutCode`: a guest gets the code in the bar, to pass on or to read back, but not the band.
            code={lobby.code}
            live={state.connection === 'open'}
            onBack={onBack}
            backLabel={t('lobby.leave')}
            minPlayers={lobby.minPlayers}
            // Pinned like the host's start button and for the same reason: it is the one thing on the page anybody can actually do.
            footer={<RoomCodeFooter code={lobby.code} />}
        >
            <WaitingForHost
                game={WITTY_WARS}
                hostName={host?.name ?? t('wittyWars.lobby.hostFallback')}
            />

            <LobbyPlayersCard
                players={lobby.players}
                maxPlayers={lobby.maxPlayers}
                minPlayers={lobby.minPlayers}
                hostId={lobby.hostId}
                userId={user?.id}
                online={state.online}
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
