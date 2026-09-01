import type { useT } from "@/features/i18n/LanguageContext";
import { ROUND_CHOICE } from "./hot-seat";
import { ROUND_DESCRIBE } from "./round-four";
import { ROUND_LIST } from "./round-five";
import { ROUND_FINALE } from "./round-six";
import { ROUND_CLOSEST } from "./round-three";

export interface RoundKindAndRule {
    /** The round's short name, e.g. "Closest guess". */
    kind: string
    /** The round's rule, in the one sentence there is room for. */
    rule: string
    /**
     * The same round at length: what happens, who does what, and what it pays.
     *
     * Two or three sentences, for the intro screen that stands in front of every round.
     * `rule` is written at whoever is holding the phone and has one line to do it in;
     * this is written at the table, before anybody is holding anything, and is the one
     * place the game explains itself properly.
     */
    brief: string
}

/**
 * What a round is called, what its rule is, and what it asks of the table — none of
 * which depend on who is playing it.
 *
 * Split out of the hand-off screen's own `roundCopy` in `[sessionId].tsx` because a
 * couple of other screens need this much before anybody has been handed the phone —
 * `RoundIntroScreen` opens every round with it, and it has no name yet to put in a
 * `job` line the way the hand-off does.
 */
export function roundKindAndRule(t: ReturnType<typeof useT>, round: number, zen = false): RoundKindAndRule {
    switch (round) {
        case ROUND_CHOICE:
            return {
                kind: t('pubquizr.play.rounds.choice'),
                rule: '',
                brief: t('pubquizr.play.intro.briefChoice')
            };
        case ROUND_CLOSEST:
            return {
                kind: t('pubquizr.play.rounds.closest'),
                rule: '',
                brief: t('pubquizr.play.intro.briefClosest')
            };
        case ROUND_DESCRIBE:
            return {
                kind: t('pubquizr.play.rounds.describe'),
                rule: '',
                brief: t('pubquizr.play.intro.briefDescribe')
            };
        case ROUND_LIST:
            return {
                kind: t('pubquizr.play.rounds.list'),
                rule: '',
                brief: zen ? t('pubquizr.play.intro.briefListZen') : t('pubquizr.play.intro.briefList')
            };
        case ROUND_FINALE:
            return {
                kind: t('pubquizr.play.rounds.finale'),
                rule: '',
                brief: t('pubquizr.play.intro.briefFinale')
            };
        default:
            return {
                kind: t('pubquizr.play.rounds.open'),
                rule: '',
                brief: t('pubquizr.play.intro.briefOpen')
            };
    }
}
