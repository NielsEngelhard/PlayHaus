import LoadingPage from "@/components/layout/LoadingPage";
import BackButton from "@/components/ui/BackButton";
import InlineNotification from "@/components/ui/InlineNotification";
import PopupModal from "@/components/ui/PopupModal";
import RoomClosedNotice from "@/components/ui/RoomClosedNotice";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import { useT } from "@/features/i18n/LanguageContext";
import LobbyView from "@/features/league-of-letters/components/LobbyView";
import BracketView from "@/features/league-of-letters/components/tournament/BracketView";
import ReadyFooter from "@/features/league-of-letters/components/tournament/ReadyFooter";
import TournamentChampion from "@/features/league-of-letters/components/tournament/TournamentChampion";
import { useLobby } from "@/features/league-of-letters/useLobby";
import { useTournament } from "@/features/league-of-letters/useTournament";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { RelativePathString, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

// A tournament, by its code: the waiting room, then the bracket, then a champion.
export default function LeagueOfLettersTournamentRoomPage() {
    const { code } = useLocalSearchParams<{ code: string }>();
    const router = useRouter();
    const styles = useStyles();
    const theme = useTheme();
    const t = useT();

    const { user } = useAuth();

    const lobby = useLobby(code, 'tournament');
    const bracket = useTournament(code);

    /** The confirm panel is up. Walking out mid-bracket is worth asking about. */
    const [leaving, setLeaving] = useState(false);

    // Everybody with a match still to play is sent to it, which is also how a reconnect finds its way back.
    const matchCode = bracket.myMatch?.lobbyCode;
    const { handOver } = lobby;
    useEffect(() => {
        if (matchCode === undefined) return;

        // Leaving for a match must not hand the tournament's own seat back, which is what an ordinary unmount would do.
        handOver();
        router.replace(ROUTES.leagueOfLettersRoom(matchCode) as RelativePathString);
    }, [handOver, matchCode, router]);

    // The host shut the room out from under everybody waiting in it.
    if (lobby.closed) {
        return (
            <RoomClosedNotice
                message={t('lol.lobby.hostClosedLobby')}
                href={ROUTES.leagueOfLettersIndex}
            />
        )
    }

    if (bracket.error !== null) {
        return (
            <View style={styles.failed}>
                <BackButton href={ROUTES.leagueOfLettersIndex} />

                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title={t('lol.tournament.noBracket')}
                    message={t(bracket.error)}
                >
                    <TextButton text={t('common.retry')} onPress={bracket.reload} />
                </InlineNotification>
            </View>
        )
    }

    const { tournament } = bracket;

    // No bracket yet: the room is still filling up, and that is an ordinary lobby.
    if (tournament === null) {
        return bracket.loading && lobby.lobby === null
            ? <LoadingPage message={t('lol.tournament.loading')} />
            : <LobbyView state={lobby} onStarted={() => bracket.reload()} />;
    }

    if (tournament.status === 'completed') {
        return <TournamentChampion tournament={tournament} userId={user?.id} />;
    }

    const stage = tournament.matches.filter(match => match.stage === tournament.stage);
    const outstanding = stage.filter(match => match.status === 'live').length;

    return (
        <View style={styles.screen}>
            <BracketView
                tournament={tournament}
                userId={user?.id}
                live={bracket.connection === 'open'}
                onBack={() => setLeaving(true)}
                footer={
                    <ReadyFooter
                        stageOver={tournament.stageOver}
                        outstanding={outstanding}
                        total={stage.length}
                        readyCount={tournament.readyCount}
                        readyNeeded={tournament.readyNeeded}
                        ready={bracket.ready}
                        readying={bracket.readying}
                        onReady={() => void bracket.readyUp()}
                        error={bracket.actionError}
                    />
                }
            />

            <PopupModal
                visible={leaving}
                title={t('lol.tournament.confirmLeave.title')}
                message={t('lol.tournament.confirmLeave.message')}
                onRequestClose={() => setLeaving(false)}
            >
                <TextButton
                    text={t('lol.tournament.confirmLeave.action')}
                    variant='primary'
                    fullWidth
                    onPress={() => router.replace(ROUTES.leagueOfLettersIndex)}
                />

                <TextButton
                    text={t('lol.lobby.stay')}
                    variant='muted'
                    fullWidth
                    onPress={() => setLeaving(false)}
                />
            </PopupModal>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    screen: {
        flex: 1,
        width: '100%'
    },
    // The gutters a chromeless failure page lays down for itself.
    failed: {
        flex: 1,
        width: '100%',
        gap: Spacing.two,
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.four
    }
}))
