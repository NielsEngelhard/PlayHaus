import CreateQuizRoom from "@/features/pubquizr/components/room/CreateQuizRoom";

// Opening a room the ordinary way: the phones are the whole game unless the host says otherwise.
export default function QuizzerCreateRoomPage() {
    return <CreateQuizRoom wantsScreen={false} />;
}
