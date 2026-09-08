// Fixtures for the parts of the solo mode page that have no backend yet.

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
