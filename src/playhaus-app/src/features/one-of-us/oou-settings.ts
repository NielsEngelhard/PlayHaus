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
