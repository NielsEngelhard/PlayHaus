// The day the word of the day belongs to, and how it is written out.

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

// The two or three letters under a box in the streak row.
export function weekdayLabel(weekday: number, language: string): string {
    const label = new Intl.DateTimeFormat(language, {
        timeZone: 'UTC',
        weekday: 'short'
    }).format(new Date(WEEK_ANCHOR + weekday * DAY_MS));

    return label.replaceAll('.', '').toLowerCase();
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

// A friend's day, as the panel will read it once there is a social graph behind it.
export interface DailyFriend {
    name: string
    /** Which swatch in `AVATAR_COLORS`, not a colour — same as on `User`. */
    avatarColorId: string
    streak: number
    // How many guesses today took them, absent while they have not played it.
    guesses?: number
}

/** Fake rows, so the panel and its layout are ready for a real friends list. */
export const MOCK_FRIENDS: DailyFriend[] = [
    { name: 'Sanne', avatarColorId: 'mint', streak: 12, guesses: 3 },
    { name: 'Joris', avatarColorId: 'blush', streak: 5, guesses: 5 },
    { name: 'Tess', avatarColorId: 'cobalt', streak: 2 }
];
