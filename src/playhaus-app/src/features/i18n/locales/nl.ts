import type { Catalog } from '@/features/i18n/catalog';

export const nl: Catalog = {
    home: {
        headline: {
            title: 'Kleine spelletjes,',
            accent: 'groot plezier.'
        },
        subtitle: 'Partygames voor jou en je vrienden. Kies er eentje en spelen maar!'
    },
    games: {
        leagueOfLetters: {
            description: 'Jaag op het verborgen woord. Solo, of verneder je vrienden.',
            tag: { category: 'Woord', players: '1-6 spelers' }
        },
        quizzer: {
            description: 'Ontdek wie de slimste is (en wie niet).',
            tag: { category: 'Trivia', players: '2-20 spelers' }
        }
    }
};
