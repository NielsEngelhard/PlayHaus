import { ROUTES } from "@/constants/routes";
import TableDoor from "@/features/pubquizr/components/table/TableDoor";

// The short way in, because this is the address somebody types on a television remote.
export default function TvDoorPage() {
    return <TableDoor backHref={ROUTES.home} />;
}
