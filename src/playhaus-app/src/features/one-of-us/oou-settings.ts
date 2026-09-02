import { OneOfUsRole } from "@/features/one-of-us/models"

/**
 * The table One of Us is played at.
 *
 * Nine rather than eight, which is where a pub quiz stops: the imposter count is one in
 * every three players (see `ImpostersFor` on the server), so nine is the last size that
 * divides evenly and the last one where the ratio is exactly what the rules promise.
 * The API enforces the same two numbers.
 */
export const MIN_PLAYERS: number = 3
export const MAX_PLAYERS: number = 9

/**
 * The roles a table is allowed to switch off, in the order the settings row lists them.
 *
 * Only the imposter side is here, and that is the rule rather than an accident of what
 * exists today. The civilian is missing because a table with nobody honest at it has
 * nobody for the liars to hide among, and the mayor is missing because it was never one
 * of these — it is a flag on a seat, drawn from the whole table after the roles are
 * dealt, so it is as likely to land on an imposter as on anybody else. Both are always
 * in the game. The server keeps the same list in `ImposterRoles`.
 */
export const TOGGLEABLE_ROLES: OneOfUsRole[] = [
    OneOfUsRole.Imposter,
    OneOfUsRole.Nitwit
]

/** Everything on, which is the game as it was before the row existed. */
export const DEFAULT_ENABLED_ROLES: OneOfUsRole[] = [...TOGGLEABLE_ROLES]

/**
 * The set with one role flipped, or the set unchanged when flipping it would empty it.
 *
 * Returning the same set rather than refusing loudly, because the row does not offer the
 * move in the first place — the last switch still standing is drawn disabled, with a line
 * under the group saying why. This is the second lock rather than the first one: state
 * that cannot reach a table with no liars on it, whatever the UI above it does.
 *
 * A table with every imposter role off is not a quiet game of nothing but civilians. It
 * is a game with no win condition at all, because the only way the civilians win is by
 * voting out the last imposter — and the API refuses it for the same reason.
 */
export function toggleRole(enabled: OneOfUsRole[], role: OneOfUsRole): OneOfUsRole[] {
    if (!enabled.includes(role)) {
        // Rebuilt from TOGGLEABLE_ROLES rather than appended to, so the set that goes
        // out on the wire is always in the row's own order however it was arrived at.
        return TOGGLEABLE_ROLES.filter(candidate => candidate === role || enabled.includes(candidate))
    }

    if (!canDisableRole(enabled, role)) return enabled

    return enabled.filter(candidate => candidate !== role)
}

/** Whether this role's switch is live, or is the last one holding the game up. */
export function canDisableRole(enabled: OneOfUsRole[], role: OneOfUsRole): boolean {
    return !enabled.includes(role) || enabled.length > 1
}
