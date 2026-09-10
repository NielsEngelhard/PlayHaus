import type { PQLobby } from "@/api/calls/pubquizr-lobby";
import LobbyPageBase from "@/components/layout/LobbyPageBase";
import AppText from "@/components/text/AppText";
import InlineNotification from "@/components/ui/InlineNotification";
import LobbySeatGrid from "@/components/ui/LobbySeatGrid";
import StartGameButton from "@/components/ui/StartGameButton";
import ToggleRow from "@/components/ui/ToggleRow";
import { PUBQUIZR } from "@/constants/games";
import { useAuth } from "@/features/auth/useAuth";
import InviteFriendModal from "@/features/friends/components/InviteFriendModal";
import { useT } from "@/features/i18n/LanguageContext";
import QuizPicker from "@/features/pubquizr/components/QuizPicker";
import type { PQLobbyState } from "@/features/pubquizr/multi-device/useQuizLobby";
import { useSelectedQuiz } from "@/features/pubquizr/useSelectedQuiz";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useState } from "react";
import { View } from "react-native";

interface Props {
    /** Everything `useQuizLobby` returned, plus the room itself, already known to exist. */
    state: PQLobbyState,
    lobby: PQLobby,
    /** Opens the close-the-room confirm. Owned by `QuizLobbyView`, which also acts on it. */
    onBack: () => void,
    onStart: () => void
}

// The room, on the screen of whoever opened it: the only phone with the quiz picker and the start button.
export default function HostRoom({ state, lobby, onBack, onStart }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const { user } = useAuth();

    const [inviting, setInviting] = useState(false);

    // Seeded from the room, so a host coming back to it sees what they already picked.
    const selected = useSelectedQuiz(lobby.setup.quizId);

    const enough = lobby.players.length >= lobby.minPlayers;
    const picked = lobby.setup.quizId !== undefined;

    return (
        <LobbyPageBase
            game={PUBQUIZR}
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
                        text={state.starting ? t('common.busy') : t('pubquizr.lobby.start')}
                        onPress={onStart}
                        // A save still in the air means the evening could be dealt on a quiz that did not stick.
                        disabled={state.starting || state.saving || !enough || !picked}
                    />

                    <AppText style={styles.footnote}>
                        {!enough
                            ? t('pubquizr.lobby.needPlayers', { min: lobby.minPlayers })
                            : !picked
                                ? t('pubquizr.lobby.needQuiz')
                                : t('pubquizr.lobby.startNote')}
                    </AppText>
                </View>
            }
        >
            <InlineNotification
                icon='airplay'
                color={theme.colors.mint}
                title={t('pubquizr.lobby.screenHint.title')}
                message={t('pubquizr.lobby.screenHint.message')}
            />

            <LobbySeatGrid
                players={lobby.players}
                maxPlayers={lobby.maxPlayers}
                hostId={lobby.hostId}
                userId={user?.id}
                online={state.online}
                accent={PUBQUIZR.color}
                onInvite={() => setInviting(true)}
            />

            {/* Already a fenced panel of its own, so no card around it. */}
            <QuizPicker
                quiz={selected.quiz}
                onSelect={quiz => {
                    selected.select(quiz);
                    state.updateSetup({ quizId: quiz.id });
                }}
            />

            {/* Trivia first, because it is the bigger cut of the two. */}
            <ToggleRow
                flush
                value={lobby.setup.triviaMode}
                onChange={trivia => state.updateSetup(
                    // The two cuts cannot both be on, and trivia is the one that wins.
                    trivia ? { triviaMode: true, zenMode: false } : { triviaMode: false }
                )}
                label={t('pubquizr.oneDevice.triviaMode.label')}
                description={t('pubquizr.oneDevice.triviaMode.description')}
            />

            {!lobby.setup.triviaMode && (
                <ToggleRow
                    flush
                    value={lobby.setup.zenMode}
                    onChange={zen => state.updateSetup({ zenMode: zen })}
                    label={t('pubquizr.oneDevice.zenMode.label')}
                    description={t('pubquizr.oneDevice.zenMode.description')}
                />
            )}

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
