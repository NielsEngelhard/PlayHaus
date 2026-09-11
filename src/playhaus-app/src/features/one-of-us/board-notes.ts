import { Brand, type Theme } from '@/constants/theme';

// The prikbord: every briefje is pinned by hand, so no two hang at quite the same angle.

/** What a briefje on the board is saying about itself. */
export type NoteTone = 'paper' | 'picked' | 'out' | 'mine';

/** The angles a pinned note comes to rest at, in the order they come round. */
const TILTS = [-1.5, 1, -0.5, 1.5, -1, 2, 0.5, -2];

// Which way this note hangs. Dealt from its position, so a list does not reshuffle itself on every render.
export function tiltFor(index: number): string {
    const at = ((index % TILTS.length) + TILTS.length) % TILTS.length;

    return `${TILTS[at]}deg`;
}

/** The two inks a note is written in, given whichever fill it is wearing. */
export interface NoteInk {
    text: string,
    muted: string
}

// A tinted note is pale in both schemes, so it keeps ink on it in both; only plain paper follows the scheme.
export function noteInkOf(tone: NoteTone, theme: Theme): NoteInk {
    switch (tone) {
        case 'picked':
        case 'out':
            return { text: Brand.ink, muted: 'rgba(15, 13, 18, 0.6)' };
        case 'mine':
            return { text: theme.colors.textSecondary, muted: theme.colors.textMuted };
        default:
            return { text: theme.colors.text, muted: theme.colors.textMuted };
    }
}
