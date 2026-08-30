import { MAX_LOBBY_PLAYERS, MIN_LOBBY_PLAYERS, type Lobby } from "@/api/calls/league-of-letters-lobby";
import LobbyPageBase from "@/components/layout/LobbyPageBase";
import AppText from "@/components/text/AppText";
import InlineNotification from "@/components/ui/InlineNotification";
import LobbySeatGrid from "@/components/ui/LobbySeatGrid";
import StartGameButton from "@/components/ui/StartGameButton";
import { LEAGUE_OF_LETTERS } from "@/constants/games";
import { useAuth } from "@/features/auth/useAuth";
import { useT } from "@/features/i18n/LanguageContext";
import LobbySettingsCard from "@/features/league-of-letters/components/LobbySettingsCard";
import type { LobbyState } from "@/features/league-of-letters/useLobby";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { View } from "react-native";

interface Props {
    /** Everything `useLobby` returned, plus the room itself, already known to exist. */
    state: LobbyState,
    lobby: Lobby,
    /** Opens the close-the-room confirm. Owned by `LobbyView`, which also acts on it. */
    onBack: () => void,
    onStart: () => void
}

/**
 * The room, on the screen of whoever opened it.
 *
 * Everything about the *shape* of this screen lives in `LobbyPageBase` now — the bar, the
 * code band, the scrolling middle, the pinned footer — so what is left here is only the
 * three things that are League of Letters': who the seats belong to, what this game has to
 * set, and what starting it says.
 */
export default function HostLobby({ state, lobby, onBack, onStart }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const { user } = useAuth();

    const enough = lobby.players.length >= MIN_LOBBY_PLAYERS;

    return (
        <LobbyPageBase
            game={LEAGUE_OF_LETTERS}
            title={t('lobby.yourRoom')}
            live={state.connection === 'open'}
            onBack={onBack}
            backLabel={t('lobby.close')}
            code={lobby.code}
            // The host's screen is the one with something to offer, so it gets the band
            // as well as the pill.
            handsOutCode
            footer={
                <View>
                    <StartGameButton
                        text={state.starting ? t('common.busy') : t('lol.lobby.start')}
                        onPress={onStart}
                        // A room of one has nobody to play against, and a save still in
                        // the air means the game could start on settings that did not stick.
                        disabled={state.starting || state.saving || !enough}
                    />

                    {/*
                      * The design promised latecomers could still join after the first
                      * round. They cannot: the backend refuses a join once a lobby has
                      * started, so this says the true thing instead — which is also the
                      * more useful one, since it is the last moment anybody can be added.
                      */}
                    <AppText style={styles.footnote}>
                        {enough ? t('lol.lobby.startNote') : t('lol.lobby.needPlayers')}
                    </AppText>
                </View>
            }
        >
            <LobbySeatGrid
                players={lobby.players}
                maxPlayers={MAX_LOBBY_PLAYERS}
                hostId={lobby.hostId}
                userId={user?.id}
                online={state.online}
                accent={LEAGUE_OF_LETTERS.color}
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
