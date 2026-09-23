import { getDictionary } from '@/api/calls/league-of-letters';
import type { LanguageCode } from '@/constants/languages';
import { useEffect, useState } from 'react';

// Resolved lists, kept at module scope so a second round or a rematch never refetches.
const CACHE = new Map<string, Set<string>>();
const INFLIGHT = new Map<string, Promise<Set<string> | null>>();

const keyOf = (locale: LanguageCode, wordLength: number) => `${locale}-${wordLength}`;

async function load(locale: LanguageCode, wordLength: number): Promise<Set<string> | null> {
    const key = keyOf(locale, wordLength);

    const cached = CACHE.get(key);
    if (cached !== undefined) return cached;

    const running = INFLIGHT.get(key);
    if (running !== undefined) return running;

    const request = getDictionary(locale, wordLength)
        .then(dictionary => {
            const words = new Set(dictionary.words);
            CACHE.set(key, words);
            return words;
        })
        .catch(() => {
            // A list that will not load costs nothing: the server still rules on every guess.
            return null;
        })
        .finally(() => { INFLIGHT.delete(key); });

    INFLIGHT.set(key, request);
    return request;
}

// A list, and which pair it is the list for.
interface Loaded {
    key: string
    words: Set<string> | null
}

/** The guessable list, or null until it arrives. A caller that has no list must submit and let the server answer. */
export function useDictionary(locale: LanguageCode, wordLength: number): Set<string> | null {
    const key = keyOf(locale, wordLength);
    const [loaded, setLoaded] = useState<Loaded>(() => ({ key, words: CACHE.get(key) ?? null }));

    useEffect(() => {
        let cancelled = false;

        void load(locale, wordLength).then(words => {
            if (!cancelled) setLoaded({ key: keyOf(locale, wordLength), words });
        });

        return () => { cancelled = true; };
    }, [locale, wordLength]);

    // A list for another language or length is no list at all, which leaves the server the judge until the right one lands.
    return loaded.key === key ? loaded.words : null;
}

/** Whether the list says this is a word. An absent list agrees with everything, so the server stays the judge. */
export function isKnownWord(words: Set<string> | null, word: string): boolean {
    if (words === null) return true;
    return words.has(word.toLowerCase());
}
