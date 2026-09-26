import { isLanguageCode, type LanguageCode } from "@/constants/languages"
import { OneOfUsRole } from "@/features/one-of-us/models"
import { boolParam, firstParam, toBoolParam } from "@/utils/search-params"

// The table One of Us is played at.
export const MIN_PLAYERS: number = 4
export const MAX_PLAYERS: number = 9

// The roles a table is allowed to switch off, in the order the settings row lists them.
export const TOGGLEABLE_ROLES: OneOfUsRole[] = [
    OneOfUsRole.Imposter,
    OneOfUsRole.Nitwit
]

// Nitwit is single-device only.
export const MULTI_DEVICE_TOGGLEABLE_ROLES: OneOfUsRole[] = TOGGLEABLE_ROLES.filter(role => role !== OneOfUsRole.Nitwit)

/** Everything on, which is the game as it was before the row existed. */
export const DEFAULT_ENABLED_ROLES: OneOfUsRole[] = [...TOGGLEABLE_ROLES]

/** Everything a multi-device table may be dealt from. */
export const DEFAULT_MULTI_DEVICE_ENABLED_ROLES: OneOfUsRole[] = [...MULTI_DEVICE_TOGGLEABLE_ROLES]

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

// What a one-device table is set up with, beyond who sits at it.
export interface SingleDeviceSettings {
    enabledRoles: OneOfUsRole[]
    locale: LanguageCode
    wordsOnly: boolean
}

// The same settings as query params, which is how "play again" carries them from the finished game back to the setup screen.
export type SingleDeviceSettingsParams = Record<keyof SingleDeviceSettings, string>

export function singleDeviceSettingsToParams(settings: SingleDeviceSettings): SingleDeviceSettingsParams {
    return {
        enabledRoles: settings.enabledRoles.join(','),
        locale: settings.locale,
        wordsOnly: toBoolParam(settings.wordsOnly)
    }
}

// All or nothing: null unless every setting is there and valid, so a hand-edited URL falls back to the defaults.
export function singleDeviceSettingsFromParams(params: Partial<Record<keyof SingleDeviceSettings, string | string[]>>): SingleDeviceSettings | null {
    const listed = firstParam(params.enabledRoles)?.split(',') ?? []
    const enabledRoles = TOGGLEABLE_ROLES.filter(role => listed.includes(String(role)))
    const locale = firstParam(params.locale)
    const wordsOnly = boolParam(params.wordsOnly)

    if (enabledRoles.length === 0 || !isLanguageCode(locale) || wordsOnly === undefined) return null

    return { enabledRoles, locale, wordsOnly }
}
