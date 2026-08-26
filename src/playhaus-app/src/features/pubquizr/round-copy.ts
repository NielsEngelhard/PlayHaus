import type { useT } from "@/features/i18n/LanguageContext";
import { ROUND_CHOICE } from "./hot-seat";
import { ROUND_DESCRIBE } from "./round-four";
import { ROUND_CLOSEST } from "./round-three";

export interface RoundKindAndRule {
    /** The round's short name, e.g. "Closest guess". */
    kind: string
    /** The round's rule, in the one sentence there is room for. */
    rule: string
}

/**
 * What a round is called and what its rule is, independent of who is playing it.
 *
 * Split out of the hand-off screen's own `roundCopy` in `[sessionId].tsx` because a
 * couple of other screens need this much before anybody has been handed the phone —
 * the standings screen headlines the round that is about to start, and it has no name
 * yet to put in a `job` line the way the hand-off does.
 */
export function roundKindAndRule(t: ReturnType<typeof useT>, round: number): RoundKindAndRule {
    switch (round) {
        case ROUND_CHOICE:
            return {
                kind: t('pubquizr.play.rounds.choice'),
                rule: t('pubquizr.play.handoff.ruleChoice')
            };
        case ROUND_CLOSEST:
            return {
                kind: t('pubquizr.play.rounds.closest'),
                rule: t('pubquizr.play.handoff.ruleClosest')
            };
        case ROUND_DESCRIBE:
            return {
                kind: t('pubquizr.play.rounds.describe'),
                rule: t('pubquizr.play.handoff.ruleDescribe')
            };
        default:
            return {
                kind: t('pubquizr.play.rounds.open'),
                rule: t('pubquizr.play.handoff.ruleOpen')
            };
    }
}
