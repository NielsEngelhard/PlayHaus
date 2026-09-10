import LoadingPage from "@/components/layout/LoadingPage";
import BackButton from "@/components/ui/BackButton";
import InlineNotification from "@/components/ui/InlineNotification";
import RoomClosedNotice from "@/components/ui/RoomClosedNotice";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/features/i18n/LanguageContext";
import TableBoard from "@/features/pubquizr/components/table/TableBoard";
import TableFrame from "@/features/pubquizr/components/table/TableFrame";
import TableLobby from "@/features/pubquizr/components/table/TableLobby";
import { useTableScale } from "@/features/pubquizr/multi-device/table-scale";
import { useQuizTable } from "@/features/pubquizr/multi-device/useQuizTable";
import { lobbySeatsOf } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";

// The shared screen. It reads the room and never writes to it, so it holds no seat and closing it costs the table nothing.
export default function QuizzerTablePage() {
    const { code } = useLocalSearchParams<{ code: string }>();
    const styles = useStyles();
    const theme = useTheme();
    const t = useT();

    const scale = useTableScale();
    const state = useQuizTable(code);

    const { lobby } = state;

    if (state.closed) {
        return (
            <RoomClosedNotice
                message={t('pubquizr.table.closed')}
                href={ROUTES.quizzerIndex}
            />
        )
    }

    if (state.error !== null) {
        return (
            <View style={styles.screen}>
                <BackButton href={ROUTES.quizzerTableDoor} />

                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title={t('pubquizr.lobby.noLobby')}
                    message={t(state.error)}
                >
                    <TextButton text={t('common.retry')} onPress={state.reload} />
                </InlineNotification>
            </View>
        )
    }

    if (lobby === null) {
        return <LoadingPage message={t('pubquizr.table.connecting')} />;
    }

    const seats = lobbySeatsOf(lobby.players);

    if (state.sessionId === undefined) {
        return (
            <TableFrame code={lobby.code} scale={scale} seats={seats}>
                <TableLobby
                    code={lobby.code}
                    minPlayers={lobby.minPlayers}
                    scale={scale}
                    seats={seats}
                />
            </TableFrame>
        )
    }

    if (state.session === null || state.quiz === null) {
        return <LoadingPage message={t('pubquizr.table.dealt')} />;
    }

    return (
        <TableBoard
            closest={state.closest}
            // The room's own code rather than the session's, which is optional on the wire while this one is certain.
            code={lobby.code}
            control={state.control}
            quiz={state.quiz}
            reveal={state.reveal}
            scale={scale}
            session={state.session}
        />
    )
}

const useStyles = createThemedStyles(() => ({
    screen: {
        flex: 1,
        width: '100%'
    }
}))
