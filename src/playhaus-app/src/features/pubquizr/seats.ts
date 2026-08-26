import { Brand } from "@/constants/theme";
import { avatarColorById, type AvatarColor } from "@/features/settings/profile";
import type { QuizSession, QuizSessionPlayer } from "./pubquizr-sessions";

/**
 * The table, as every round needs it, and the screen that passes the phone round it.
 *
 * A pub quiz session is six rounds of quite different games — a hot seat, a number
 * everybody guesses at, thirty seconds of charades — and the one thing all of them are
 * about is who is sitting where. So the seat lives here rather than inside whichever
 * round happened to need it first, which is where it used to live.
 *
 * Nothing in this file knows what round it is.
 */

export interface Seat {
    seat: number
    name: string
    score: number
    /** Two letters for the swatch — `SA` for Sanne. */
    initials: string
    swatch: AvatarColor
}

/**
 * The two letters on a seat's swatch.
 *
 * Spread rather than sliced, because a name starting with an accented pair cut by
 * index comes out as half a glyph — the same reason `initialsFor` in `quiz-shelf.ts`
 * does it, which this deliberately mirrors rather than imports: that one is about a
 * two-word quiz title, and a person is one word whose first two letters are wanted.
 */
export function initialsOf(name: string): string {
    const letters = [...name.trim()].filter(character => character.trim() !== '');

    return letters.slice(0, 2).join('').toUpperCase() || '?';
}

export function seatOf(player: QuizSessionPlayer): Seat {
    return {
        seat: player.seat,
        name: player.name,
        score: player.score,
        initials: initialsOf(player.name),
        swatch: avatarColorById(player.color)
    };
}

/** Everybody at the table, in seating order. */
export function seatsOf(session: QuizSession): Seat[] {
    return [...session.players].sort((a, b) => a.seat - b.seat).map(seatOf);
}

/** The standings, best first, with ties left in seating order. */
export function standingsOf(session: QuizSession): Seat[] {
    return seatsOf(session).sort((a, b) => b.score - a.score || a.seat - b.seat);
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

/**
 * The five fills a hand-off can wear, in the order they come round.
 *
 * Lemon alone was a screen you stop seeing: the hand-off looks the same every time, so
 * after a few questions it stops registering as a new one. A different colour each turn
 * is the cheapest way to make "this is a new screen, stop and read it" land, which is
 * the only job that screen has.
 *
 * Black on every fill but the blue, which is the one that cannot carry it: ink on
 * #3B4DF0 is 3.2:1, so the 38px name would just about pass and the 15px line under it
 * would not come close, and a hand-off whose instructions cannot be read is the one
 * thing this screen cannot afford. Orange looks like it wants paper and does not —
 * ink on it is 6.2:1 against paper's 3.0:1.
 *
 * The muted alphas are the weakest each fill can carry and still clear 4.5:1 for body
 * text, rounded up: 0.76 on orange and 0.88 on the blue are doing real work, and the
 * three light fills are held at 0.7 for the sake of looking like one family.
 */
const HANDOFF_TONES: HandoffTone[] = [
    { fill: Brand.primary,   ink: Brand.ink,          muted: 'rgba(15, 13, 18, 0.78)' },
    { fill: Brand.lemon,     ink: Brand.ink,          muted: 'rgba(15, 13, 18, 0.7)' },
    { fill: Brand.mint,      ink: Brand.ink,          muted: 'rgba(15, 13, 18, 0.7)' },
    { fill: Brand.blush,     ink: Brand.ink,          muted: 'rgba(15, 13, 18, 0.7)' },
    { fill: Brand.secondary, ink: Brand.textOnAccent, muted: 'rgba(254, 251, 248, 0.88)' }
];

/**
 * Which fill this turn's hand-off wears.
 *
 * Keyed off the turn number rather than off who is taking the phone, so the colour means
 * "the screen changed" rather than "this person". Two hand-offs in a row are always
 * different, which is the whole point.
 */
export function handoffToneFor(turnNumber: number): HandoffTone {
    // 1-based, so the first turn of a round gets the first tone.
    const index = (turnNumber - 1) % HANDOFF_TONES.length;

    return HANDOFF_TONES[(index + HANDOFF_TONES.length) % HANDOFF_TONES.length];
}

/**
 * Which fill a round's intro screen wears.
 *
 * Offset by one so it can never land on the tone the first hand-off of the round is
 * about to wear: the intro is followed immediately by `handoffToneFor(1)`, and two
 * full-bleed screens in the same colour read as one screen that did not respond to the
 * button. The offset also gives each round its own colour, which is the next best thing
 * a round can have to a name.
 */
export function roundIntroToneFor(round: number): HandoffTone {
    return handoffToneFor(round + 1);
}
