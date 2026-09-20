import CreateQuizRoom from "@/features/pubquizr/components/room/CreateQuizRoom";

// The central screen button's own way in: the same room, opened with the screen already switched on.
export default function QuizzerScreenRoomPage() {
    return <CreateQuizRoom wantsScreen />;
}
