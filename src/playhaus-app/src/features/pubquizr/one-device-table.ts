import type { TranslationKey } from "@/features/i18n/keys";
import { AVATAR_COLORS, type AvatarColor } from "@/features/settings/profile";

/**
 * Who is sitting at the table, and whether the server would take them.
 *
 * Kept in step with `MinPlayers` and `MaxPlayers` in the Go backend
 * (`internal/pubquizr/rules.go`), which refuses anything outside them. Checked here as
 * well so the common mistakes — two seats filled, the same name typed twice — are a
 * greyed-out button and a line of explanation rather than a round trip that comes back
 * with a complaint.
 */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;

/**
 * The colour the seat will wear once the game has started.
 *
 * Worked out the same way the server does it — `user.Colors[seat % len(user.Colors)]`
 * in `internal/pubquizr/service.go` — over the same list in the same order, so the
 * swatch beside a name here is the swatch that name plays under. A seat that changed
 * colour on the way into the game would make the setup screen a lie.
 */
export function colorForSeat(seat: number): AvatarColor {
    return AVATAR_COLORS[seat % AVATAR_COLORS.length];
}

/** What the server will actually be sent: trimmed, with the empty seats dropped. */
export function seatedNames(names: string[]): string[] {
    return names.map(name => name.trim()).filter(name => name !== '');
}

/**
 * Whether two seats hold the same person.
 *
 * Case-insensitively, because the server is: "Niels" and "niels" are one person as far
 * as a room shouting answers is concerned, and it answers 409 to the pair.
 */
export function duplicateSeats(names: string[]): boolean {
    const seen = new Set<string>();

    for (const name of seatedNames(names)) {
        const key = name.toLowerCase();
        if (seen.has(key)) return true;
        seen.add(key);
    }

    return false;
}

/**
 * What is wrong with the table, as the key of a line worth showing — or null when it is
 * ready to play.
 *
 * A key rather than a sentence, for the reason `game-errors.ts` spells out: this is read
 * during render and has to follow the language the app is in.
 */
export function tableProblem(names: string[]): TranslationKey | null {
    const seated = seatedNames(names);

    if (seated.length < MIN_PLAYERS) return 'pubquizr.oneDevice.players.tooFew';
    if (seated.length > MAX_PLAYERS) return 'pubquizr.oneDevice.players.tooMany';
    if (duplicateSeats(names)) return 'pubquizr.oneDevice.players.duplicate';

    return null;
}

/**
 * Reads a stored table back into a row of names, or `null` when there is nothing usable
 * there.
 *
 * Lives here rather than in `table-store.ts` because both halves of that pair need it
 * and neither may import the other: Metro resolves `@/features/pubquizr/table-store` to
 * the `.web.ts` fork on web, so the fork importing that path would be importing itself.
 *
 * Parsed defensively rather than cast. The stored string outlives any one build, and a
 * shape that used to be written and no longer is has to read as "no table remembered"
 * instead of being handed to the form as seats it cannot draw.
 */
export function parseTable(stored: string | null | undefined): string[] | null {
    if (!stored) return null;

    let parsed: unknown;
    try {
        parsed = JSON.parse(stored);
    } catch {
        return null;
    }

    if (!Array.isArray(parsed)) return null;

    const names = parsed
        .filter((name): name is string => typeof name === 'string')
        .slice(0, MAX_PLAYERS);

    return names.length > 0 ? names : null;
}
