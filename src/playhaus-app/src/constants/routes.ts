// `as const` keeps these as literal types so they satisfy expo-router's `Href`,
// which typed routes narrows to the routes that actually exist.
export const ROUTES = {
    home: "/",
    leagueOfLettersIndex: "/games/league-of-letters",
    leagueOfLettersSolo: "/games/league-of-letters/solo",
    leagueOfLettersSoloSettings: "/games/league-of-letters/settings",
    leagueOfLettersCreateRoom: "/games/league-of-letters/room",
    leagueOfLettersRoom: (code: string) => `/games/league-of-letters/room/${code}`,
    quizzerIndex: "/games/quizzer",

    reconnect: "/reconnect",
    friends: "/friends",
    profile: "/profile"
} as const