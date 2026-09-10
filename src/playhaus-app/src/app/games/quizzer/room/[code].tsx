import RoomClosedNotice from "@/components/ui/RoomClosedNotice";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/features/i18n/LanguageContext";
import QuizControlView from "@/features/pubquizr/components/control/QuizControlView";
import QuizLobbyView from "@/features/pubquizr/components/room/QuizLobbyView";
import { useQuizLobby } from "@/features/pubquizr/multi-device/useQuizLobby";
import { useLocalSearchParams } from "expo-router";

// A room, joined by its code. This is the controller: the phone half of multi device.
export default function QuizzerRoomPage() {
    const { code } = useLocalSearchParams<{ code: string }>();
    const t = useT();

    const state = useQuizLobby(code);

    const sessionId = state.lobby?.status === 'started' ? state.lobby.sessionId : undefined;

    // The host stopped the evening, or shut the room out from under everybody waiting in it.
    if (state.closed) {
        return (
            <RoomClosedNotice
                message={sessionId !== undefined
                    ? t('pubquizr.lobby.hostStoppedQuiz')
                    : t('pubquizr.lobby.hostClosedLobby')}
                href={ROUTES.quizzerIndex}
            />
        )
    }

    // The lobby hook stays mounted above this, so the room and the evening are two sockets on one room -- the pattern `fake-filler/room/[code].tsx` already uses.
    if (sessionId !== undefined) {
        return <QuizControlView code={code} />;
    }

    return (
        <QuizLobbyView
            state={state}
            // Nothing to do: this screen is already the room the evening was dealt in.
            onStarted={() => { }}
        />
    )
}
