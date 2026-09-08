// What a player was dealt.
export enum OneOfUsRole {
  Civilian = 0,
  Imposter = 1,
  // An imposter who was not even given the imposter's word.
  Nitwit = 2,
}

/** Which side a role plays for. The nitwit is dealt in place of an imposter, not beside one. */
export function withCivilians(role: OneOfUsRole): boolean {
    return role === OneOfUsRole.Civilian;
}
