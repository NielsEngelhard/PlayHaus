// `as const` keeps these as literal types so they satisfy expo-router's `Href`,
// which typed routes narrows to the routes that actually exist.
export const ROUTES = {
    home: "/",

    // League of letters
    leagueOfLettersIndex: "/games/league-of-letters",
    leagueOfLettersSolo: "/games/league-of-letters/solo",
    leagueOfLettersSoloResults: "/games/league-of-letters/solo/results",
    leagueOfLettersSoloSettings: "/games/league-of-letters/settings",
    leagueOfLettersCreateRoom: "/games/league-of-letters/room",
    leagueOfLettersRoom: (code: string) => `/games/league-of-letters/room/${code}`,
    
    // PubquizR
    quizzerIndex: "/games/quizzer",

    // The imposter
    imposterIndex: "/games/imposter",

    // User
    reconnect: "/reconnect",
    friends: "/friends",
    profile: "/profile",
    upgradeAccount: "/profile/upgrade"
} as const