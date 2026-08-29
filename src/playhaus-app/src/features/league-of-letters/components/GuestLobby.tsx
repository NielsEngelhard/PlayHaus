import type { Lobby } from "@/api/calls/league-of-letters-lobby";
import LobbyPageBase from "@/components/layout/LobbyPageBase";
import InlineNotification from "@/components/ui/InlineNotification";
import { LEAGUE_OF_LETTERS } from "@/constants/games";
import { useAuth } from "@/features/auth/useAuth";
import { useT } from "@/features/i18n/LanguageContext";
import LobbyRoster from "@/features/league-of-letters/components/LobbyRoster";
import RoomCodeFooter from "@/features/league-of-letters/components/RoomCodeFooter";
import WaitingForHost from "@/features/league-of-letters/components/WaitingForHost";
import type { LobbyState } from "@/features/league-of-letters/useLobby";
import { useTheme } from "@/features/theme/ThemeContext";

interface Props {
    state: LobbyState,
    lobby: Lobby,
    /** Opens the leave-the-room confirm. Owned by `LobbyView`, which also acts on it. */
    onBack: () => void
}

/**
 * The room, on the screen of somebody who joined it.
 *
 * The same shell as the host's and deliberately not the same screen. A guest decides
 * nothing here — not the word length, not the language, not when it starts — so showing
 * them the knobs, even as values, would be showing them a form they cannot fill in. And
 * they have no code to hand out either, having just used one, so no band: what fills that
 * space instead is the one thing they need to know, which is that the room is still there
 * and who they are waiting for.
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
            game={LEAGUE_OF_LETTERS}
            title={t('lobby.named', { code: lobby.code })}
            live={state.connection === 'open'}
            onBack={onBack}
            backLabel={t('lobby.leave')}
            // Pinned like the host's start button and for the same reason: it is the one
            // thing on the page anybody can actually do.
            footer={<RoomCodeFooter code={lobby.code} />}
        >
            <WaitingForHost
                game={LEAGUE_OF_LETTERS}
                hostName={host?.name ?? t('lol.lobby.hostFallback')}
            />

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
        </LobbyPageBase>
    )
}
