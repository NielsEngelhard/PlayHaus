import { OneOfUsRole } from "@/features/one-of-us/models"

// The table One of Us is played at.
export const MIN_PLAYERS: number = 3
export const MAX_PLAYERS: number = 9

// The roles a table is allowed to switch off, in the order the settings row lists them.
export const TOGGLEABLE_ROLES: OneOfUsRole[] = [
    OneOfUsRole.Imposter,
    OneOfUsRole.Nitwit
]

/** Everything on, which is the game as it was before the row existed. */
export const DEFAULT_ENABLED_ROLES: OneOfUsRole[] = [...TOGGLEABLE_ROLES]

// The set with one role flipped, or the set unchanged when flipping it would empty it.
export function toggleRole(enabled: OneOfUsRole[], role: OneOfUsRole): OneOfUsRole[] {
    if (!enabled.includes(role)) {
        // Rebuilt from TOGGLEABLE_ROLES rather than appended to.
        return TOGGLEABLE_ROLES.filter(candidate => candidate === role || enabled.includes(candidate))
    }

    if (!canDisableRole(enabled, role)) return enabled

    return enabled.filter(candidate => candidate !== role)
}

/** Whether this role's switch is live, or is the last one holding the game up. */
export function canDisableRole(enabled: OneOfUsRole[], role: OneOfUsRole): boolean {
    return !enabled.includes(role) || enabled.length > 1
}
