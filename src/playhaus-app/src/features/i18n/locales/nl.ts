import type { Catalog } from '@/features/i18n/catalog';

/**
 * The Dutch catalog.
 *
 * Typed as `Catalog` rather than inferred: that is what turns a key English has and
 * Dutch forgot — or a key Dutch invented — into a compile error rather than a string
 * that quietly falls back to English at runtime.
 */
export const nl: Catalog = {
    home: {
        headline: {
            title: 'Kleine spelletjes,',
            accent: 'groot gelach.'
        },
        subtitle: 'Snelle spelletjes voor trage ochtenden, lange middagen en avonden die uit de hand lopen.'
    },
    games: {
        leagueOfLetters: {
            description: 'Jaag op het verborgen woord. Solo, of kijken wie het eerst is.',
            tag: { category: 'Woord', players: '1-6 spelers' }
        },
        quizzer: {
            description: 'Pubquiz rondes, zonder de kroeg. De vragen worden nog geslepen.',
            tag: { category: 'Trivia', players: '2-10 spelers' }
        }
    },
    gameCard: {
        playable: 'Klaar voor de start',
        /** `BINNENKORT` is too wide for the badge — see the note in `en.ts`. */
        soon: 'BROEIT'
    }
};
