/**
 * What a player was dealt. The numbers are the server's own — `Role` is an int on the
 * wire, not a string — so these have to keep matching `oneofus.Role` in the API.
 */
export enum OneOfUsRole {
  Civilian = 0,
  Imposter = 1,
}
