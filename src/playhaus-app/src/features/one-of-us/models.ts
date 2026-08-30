/**
 * What a player was dealt. The numbers are the server's own — `Role` is an int on the
 * wire, not a string — so these have to keep matching `oneofus.Role` in the API.
 */
export enum OneOfUsRole {
  Civilian = 0,
  Imposter = 1,
  /**
   * An imposter who was not even given the imposter's word.
   *
   * Dealt only at the table sizes carrying three imposters or more, and never more than
   * one — see `NitwitsFor` on the server. Everything that treats a role as a two-way
   * choice has to be told about this one: it plays for the imposters but there is no
   * word behind it, so a screen switching on `=== Imposter` will call it a civilian.
   */
  Nitwit = 2,
}

/** Which side a role plays for. The nitwit is dealt in place of an imposter, not beside one. */
export function withCivilians(role: OneOfUsRole): boolean {
    return role === OneOfUsRole.Civilian;
}
