import { Brand } from "@/constants/theme";
import { type AvatarColor } from "@/utils/color-utils";

// A person at a table, as every screen that draws one needs them.

export interface Seat {
    seat: number
    name: string
    score: number
    /** Two letters for the swatch — `SA` for Sanne. */
    initials: string
    swatch: AvatarColor
}

// The two letters on a seat's swatch.
export function initialsOf(name: string): string {
    const letters = [...name.trim()].filter(character => character.trim() !== '');

    return letters.slice(0, 2).join('').toUpperCase() || '?';
}

/** One seat out of a list, or null when that seat is not at this table. */
export function seatAt(seats: Seat[], seat: number | null): Seat | null {
    if (seat === null) return null;

    return seats.find(candidate => candidate.seat === seat) ?? null;
}

/** How a hand-off screen is painted: one fill, and the ink that stays readable on it. */
export interface HandoffTone {
    fill: string
    /** Headline text. */
    ink: string
    /** The same ink stepped back, for the step label and the explanation line. */
    muted: string
}

// The five fills a hand-off can wear, in the order they come round.
const HANDOFF_TONES: HandoffTone[] = [
    { fill: Brand.primary,   ink: Brand.ink,          muted: 'rgba(15, 13, 18, 0.78)' },
    { fill: Brand.lemon,     ink: Brand.ink,          muted: 'rgba(15, 13, 18, 0.7)' },
    { fill: Brand.mint,      ink: Brand.ink,          muted: 'rgba(15, 13, 18, 0.7)' },
    { fill: Brand.blush,     ink: Brand.ink,          muted: 'rgba(15, 13, 18, 0.7)' },
    { fill: Brand.secondary, ink: Brand.textOnAccent, muted: 'rgba(254, 251, 248, 0.88)' }
];

// Which fill this turn's hand-off wears.
export function handoffToneFor(turnNumber: number): HandoffTone {
    // 1-based, so the first turn of a round gets the first tone.
    const index = (turnNumber - 1) % HANDOFF_TONES.length;

    return HANDOFF_TONES[(index + HANDOFF_TONES.length) % HANDOFF_TONES.length];
}

// Which fill a round's intro screen wears.
export function roundIntroToneFor(round: number): HandoffTone {
    return handoffToneFor(round + 1);
}

export function joinNames(names: string[], and: string): string {
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];

    return `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`;
}
