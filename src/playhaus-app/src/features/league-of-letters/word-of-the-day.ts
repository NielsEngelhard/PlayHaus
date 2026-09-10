// The day the word of the day belongs to, how it is written out, and the calendar it sits in.

import type { DailyDay } from '@/api/calls/league-of-letters';

/** The one zone the word turns over in, for everybody. Mirrors `DAILY_RESET_TZ` on the API. */
export const RESET_ZONE = 'Europe/Amsterdam';

// en-CA writes a date in ISO order, which is exactly the key the API days are named with.
const DAY_KEY = new Intl.DateTimeFormat('en-CA', {
    timeZone: RESET_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

const ZONE_CLOCK = new Intl.DateTimeFormat('en-GB', {
    timeZone: RESET_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
});

const MINUTES_PER_DAY = 24 * 60;

// 7 January 2024 was a Sunday, which is where Go's weekday numbering starts.
const WEEK_ANCHOR = Date.UTC(2024, 0, 7);

const DAY_MS = 86_400_000;

/** Which day it is where the word turns over, whatever the device's own clock says. */
export function resetDayKey(now: Date): string {
    return DAY_KEY.format(now);
}

/** Today in the reset zone, as a UTC midnight: format it with `timeZone: 'UTC'` and it cannot shift back a day. */
export function resetDay(now: Date): Date {
    return dayDate(resetDayKey(now));
}

// How long the current word has left, as hh:mm. `resetsAt` is the server's own answer; without one the reset zone is read off the clock.
export function untilReset(now: Date, resetsAt?: string): string {
    const minutes = resetsAt === undefined
        ? minutesToZoneMidnight(now)
        : minutesUntil(now, new Date(resetsAt));

    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

// Only ever an hour out on the two nights a year the clocks move, and only until the next reload.
function minutesToZoneMidnight(now: Date): number {
    const [hours, minutes] = ZONE_CLOCK.format(now).split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;

    return MINUTES_PER_DAY - (hours * 60 + minutes);
}

function minutesUntil(now: Date, then: Date): number {
    return Math.max(0, Math.round((then.getTime() - now.getTime()) / 60_000));
}

function pad(value: number): string {
    return String(value).padStart(2, '0');
}

// "Dinsdag 8 sep", off the server's day rather than the device's date.
export function dayTitle(day: string, language: string): string {
    const label = new Intl.DateTimeFormat(language, {
        timeZone: 'UTC',
        weekday: 'long',
        day: 'numeric',
        month: 'short'
    }).format(dayDate(day));

    return capitalised(label.replaceAll('.', ''));
}

// The one letter over a column of the calendar.
export function weekdayInitial(weekday: number, language: string): string {
    const label = new Intl.DateTimeFormat(language, {
        timeZone: 'UTC',
        weekday: 'short'
    }).format(new Date(WEEK_ANCHOR + weekday * DAY_MS));

    return label.charAt(0).toLowerCase();
}

const DAYS_PER_WEEK = 7;

/** The columns of the calendar, Monday first, as the weekdays Go numbers from Sunday. */
export const WEEKDAY_COLUMNS: number[] = [1, 2, 3, 4, 5, 6, 0];

// "September", off the server's day rather than the device's date.
export function monthTitle(day: string, language: string): string {
    const label = new Intl.DateTimeFormat(language, {
        timeZone: 'UTC',
        month: 'long'
    }).format(dayDate(day));

    return capitalised(label);
}

/** The month as calendar rows, padded with the blanks that keep every box under its own weekday. */
export function monthWeeks(month: DailyDay[]): (DailyDay | null)[][] {
    if (month.length === 0) return [];

    // Go numbers Sunday 0, and the calendar starts on Monday.
    const lead = (month[0].weekday + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;

    const boxes: (DailyDay | null)[] = [...Array<null>(lead).fill(null), ...month];
    const weeks: (DailyDay | null)[][] = [];

    for (let start = 0; start < boxes.length; start += DAYS_PER_WEEK) {
        const week = boxes.slice(start, start + DAYS_PER_WEEK);

        weeks.push([...week, ...Array<null>(DAYS_PER_WEEK - week.length).fill(null)]);
    }

    return weeks;
}

/** How few guesses still counts as a quick day, which is the calendar's own dividing line. */
export const QUICK_GUESSES = 3;

/** What one box of the calendar says: how the day went, or that there was never anything in it. */
export type DayTone = 'quick' | 'slow' | 'missed' | 'open' | 'skipped' | 'future';

export function dayTone(day: DailyDay, today: string): DayTone {
    if (day.played) {
        if (!day.solved) return 'missed';

        return day.guesses <= QUICK_GUESSES ? 'quick' : 'slow';
    }

    if (day.day === today) return 'open';

    return day.day < today ? 'skipped' : 'future';
}

// A day key is a bare date, so it is read at UTC midnight and printed in UTC — never shifted into a zone.
function dayDate(day: string): Date {
    return new Date(`${day}T00:00:00Z`);
}

function capitalised(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/** An average, written the way the language writes one — 3,4 in Dutch. */
export function averageLabel(average: number, language: string): string {
    return average.toLocaleString(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

