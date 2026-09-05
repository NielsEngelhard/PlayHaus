import { Brand } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { OneOfUsRole } from "@/features/one-of-us/models";

/** How one role is dressed: its colour, its mark, and the lines it is explained in. */
export interface RoleFace {
    fill: string
    icon: 'users' | 'zap' | 'help-circle' | 'eye-off'
    name: TranslationKey
    explanation: TranslationKey
    briefing: TranslationKey
}

export const ROLE_FACES: Record<OneOfUsRole, RoleFace> = {
    [OneOfUsRole.Civilian]: {
        fill: Brand.mint,
        icon: 'users',
        name: 'oneOfUs.play.reveal.role.civilian.name',
        explanation: 'oneOfUs.play.reveal.role.civilian.explanation',
        briefing: 'oneOfUs.play.briefing.role.civilian'
    },
    [OneOfUsRole.Imposter]: {
        fill: Brand.primary,
        icon: 'zap',
        name: 'oneOfUs.play.reveal.role.imposter.name',
        explanation: 'oneOfUs.play.reveal.role.imposter.explanation',
        briefing: 'oneOfUs.play.briefing.role.imposter'
    },
    [OneOfUsRole.Nitwit]: {
        fill: Brand.lemon,
        icon: 'help-circle',
        name: 'oneOfUs.play.reveal.role.nitwit.name',
        explanation: 'oneOfUs.play.reveal.role.nitwit.explanation',
        briefing: 'oneOfUs.play.briefing.role.nitwit'
    }
};

/**
 * What a civilian and an imposter are both shown when the phone reveals their word — one
 * face for the two of them, so the card cannot out an imposter before the table gets to.
 * Only `revealFaceOf` hands this out; `faceOf` (the briefing, the elimination screen and
 * the game-over reveal, all of which are allowed to name names once it is safe to) never
 * does.
 */
const UNKNOWN_FACE: RoleFace = {
    fill: Brand.fog,
    icon: 'eye-off',
    name: 'oneOfUs.play.reveal.role.unknown.name',
    explanation: 'oneOfUs.play.reveal.role.unknown.explanation',
    // Unused: revealFaceOf is never the briefing's caller, so nothing ever reads this.
    briefing: 'oneOfUs.play.briefing.role.civilian'
};

export const ROLES: OneOfUsRole[] = [
    OneOfUsRole.Civilian,
    OneOfUsRole.Imposter,
    OneOfUsRole.Nitwit
];

export function faceOf(role: OneOfUsRole): RoleFace {
    return ROLE_FACES[role] ?? ROLE_FACES[OneOfUsRole.Civilian];
}

/**
 * What the phone actually shows the player holding it, as opposed to what `faceOf` would
 * say the role is.
 *
 * The nitwit is told outright: no word at all is the whole of their hand, and there is
 * nothing to bluff by hiding it. A civilian and an imposter are not — telling either of
 * them apart here is exactly the thing a reveal is not allowed to do, since an imposter
 * handed "you are the imposter" already knows something the table does not and has
 * nothing left to work out.
 */
export function revealFaceOf(role: OneOfUsRole): RoleFace {
    return role === OneOfUsRole.Nitwit ? ROLE_FACES[OneOfUsRole.Nitwit] : UNKNOWN_FACE;
}
