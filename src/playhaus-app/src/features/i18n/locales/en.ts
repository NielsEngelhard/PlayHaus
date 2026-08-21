/**
 * The English catalog, and the shape every other language is checked against.
 *
 * English rather than Dutch is the source of truth on purpose: it is what the UI falls
 * back to when nobody has told us which language to speak (`FALLBACK_UI_LANGUAGE`), so
 * it is the one catalog that must never have a hole in it.
 *
 * `as const` is load-bearing. It keeps the values as string literals, which is what lets
 * i18next's types see `{{name}}` placeholders and demand them at the call site. It is
 * also why `Catalog` has to widen the leaves back to `string` — see `catalog.ts`.
 */
export const en = {
    home: {
        headline: {
            /** First line of the hero. `BigIntroText` draws the second one inverted. */
            title: 'Tiny games,',
            accent: 'serious fun.'
        },
        subtitle: 'Quick games for slow mornings, long afternoons and evenings that get out of hand.'
    },
    /**
     * The games' copy. Keyed by a camelCase name rather than the `/games/{slug}` path
     * segment: the registry in `constants/games.ts` carries the key explicitly, so the
     * two never have to match, and a dotted i18next path is a poor home for a kebab-case
     * slug.
     *
     * Names are absent by design — they are brands, and `constants/games.ts` keeps them.
     */
    games: {
        leagueOfLetters: {
            description: 'Hunt the hidden word. Solo, or see who gets there first.',
            /** One entry per chip on the home card. See `Game.tagKeys`. */
            tag: { category: 'Word', players: '1-6 players' }
        },
        quizzer: {
            description: 'Pub quiz rounds, minus the pub. The questions are still being sharpened.',
            tag: { category: 'Trivia', players: '2-10 players' }
        }
    },
    gameCard: {
        playable: 'Ready to play',
        /**
         * Keep this to one short word in every language. The badge is `flexShrink: 0`
         * beside a `flex: 1` body, so a long one doesn't wrap — it squeezes the card and
         * truncates the game's name on a narrow phone. Dutch `BINNENKORT` is already too
         * wide, which is why the Dutch catalog says `BROEIT` instead.
         */
        soon: 'BREWING'
    }
} as const;
