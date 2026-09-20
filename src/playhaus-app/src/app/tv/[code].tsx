import { PUBQUIZR } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { resolveJoinCode, sanitize } from "@/features/join/join-code";
import { Redirect, useLocalSearchParams, type RelativePathString } from "expo-router";

// `playhaus/tv/PQZUC` typed straight into a television, which is shorter to key in than the screen's own address.
export default function TvCodePage() {
    const { code } = useLocalSearchParams<{ code: string }>();

    const cleaned = sanitize(code ?? '');
    const target = resolveJoinCode(cleaned);
    const quiz = target.kind === 'route' && target.game === PUBQUIZR;

    // A code for another game has no screen to open, so it goes back to the door rather than nowhere.
    return <Redirect href={(quiz ? ROUTES.quizzerTable(cleaned) : ROUTES.tvDoor) as RelativePathString} />;
}
