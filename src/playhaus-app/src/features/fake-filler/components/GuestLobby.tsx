import type { FFLobby } from "@/api/calls/fake-filler-lobby";
import LobbyPageBase from "@/components/layout/LobbyPageBase";
import InlineNotification from "@/components/ui/InlineNotification";
import LobbyRoster from "@/components/ui/LobbyRoster";
import RoomCodeFooter from "@/components/ui/RoomCodeFooter";
import WaitingForHost from "@/components/ui/WaitingForHost";
import { FAKE_FILLER } from "@/constants/games";
import { useAuth } from "@/features/auth/useAuth";
import type { FFLobbyState } from "@/features/fake-filler/useLobby";
import { useT } from "@/features/i18n/LanguageContext";
import { useTheme } from "@/features/theme/ThemeContext";

interface Props {
    state: FFLobbyState,
    lobby: FFLobby,
    /** Opens the leave-the-room confirm. Owned by `LobbyView`, which acts on it. */
    onBack: () => void
}

/**
 * The room, on the screen of somebody who joined it.
 *
 * The same shell as the host's and deliberately not the same screen. A guest decides
 * nothing here — not the mode, not the language, not when it starts — so showing them the
 * knobs, even as values, would be showing them a form they cannot fill in. And they have
 * no code to hand out either, having just used one, so no band: what fills that space
 * instead is the one thing they need to know, which is that the room is still there and
 * who they are waiting for.
 */
export default function GuestLobby({ state, lobby, onBack }: Props) {
    const t = useT();
    const theme = useTheme();

    const { user } = useAuth();

    // The host is always the first player, but read by id rather than by position: the
    // guarantee lives in the backend, and this screen puts their name in a sentence.
    const host = lobby.players.find(player => player.userId === lobby.hostId);

    return (
        <LobbyPageBase
            game={FAKE_FILLER}
            title={t('lobby.named', { code: lobby.code })}
            // No `handsOutCode`: a guest gets the code in the bar, to pass on or to read
            // back, but not the band — they already used it to get in.
            code={lobby.code}
            live={state.connection === 'open'}
            onBack={onBack}
            backLabel={t('lobby.leave')}
            // Pinned like the host's start button and for the same reason: it is the one
            // thing on the page anybody can actually do.
            footer={<RoomCodeFooter code={lobby.code} />}
        >
            <WaitingForHost
                game={FAKE_FILLER}
                hostName={host?.name ?? t('fakeFiller.lobby.hostFallback')}
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
