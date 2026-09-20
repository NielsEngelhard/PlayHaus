import { ROUTES } from "@/constants/routes";
import TableDoor from "@/features/pubquizr/components/table/TableDoor";

// The game's own way to the shared screen, for a laptop already sitting on this page.
export default function QuizzerTableDoorPage() {
    return <TableDoor backHref={ROUTES.quizzerIndex} />;
}
