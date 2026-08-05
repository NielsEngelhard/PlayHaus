// `as const` keeps these as literal types so they satisfy expo-router's `Href`,
// which typed routes narrows to the routes that actually exist.
export const ROUTES = {
    home: "/",
    leagueOfLettersIndex: "/games/league-of-letters",
    quizzerIndex: "/games/quizzer"
} as const