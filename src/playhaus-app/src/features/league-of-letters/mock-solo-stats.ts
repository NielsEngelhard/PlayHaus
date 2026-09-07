/**
 * Fixtures for the parts of the solo mode page that have no backend yet.
 *
 * TODO: none of this is real. There is no streak, no play count, no personal best and no
 * daily word, and nothing on the API answers for a friend's attempt at one. The solo mode
 * page draws them anyway because the shape of that page is the thing being decided, and a
 * band with three empty pills on it does not let anyone decide it.
 *
 * Kept in one file, out of the components, so that when those endpoints land there is
 * exactly one thing to delete and the compiler names every screen that was leaning on it.
 * Everything here is a constant on purpose — nothing is randomised, so two people looking
 * at the same screenshot are looking at the same numbers.
 */

export interface MockSoloStats {
    /** Days in a row with the daily word solved. */
    streakDays: number,
    /** Solo games finished, ever. */
    played: number,
    /** The best score of any of them. */
    best: number
}

export const MOCK_SOLO_STATS: MockSoloStats = {
    streakDays: 7,
    played: 142,
    best: 812
};

export interface MockFriendToday {
    name: string,
    /** An id out of `AVATAR_COLORS`, exactly as a real player carries one. */
    avatarColorId: string,
    /** How many guesses today's word took them. */
    guesses: number
}

/** Who has already played today's word, and how well. */
export const MOCK_FRIENDS_TODAY: MockFriendToday[] = [
    { name: 'Mila', avatarColorId: 'mint', guesses: 3 },
    { name: 'Sem', avatarColorId: 'blush', guesses: 5 }
];
