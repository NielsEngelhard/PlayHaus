// Whether this device is still standing in a room, counted rather than flagged: two screens can be mounted on the same code for a frame while one replaces the other.

// How many screens on this device are sitting in each room, by join code. Codes name their game, so one map serves every game.
const holders = new Map<string, number>();

export function hold(code: string): void {
    holders.set(code, (holders.get(code) ?? 0) + 1);
}

/** Lets go of one hold. True when it was the last, so the room is nobody's now. */
export function release(code: string): boolean {
    const left = (holders.get(code) ?? 1) - 1;
    if (left > 0) {
        holders.set(code, left);
        return false;
    }

    holders.delete(code);
    return true;
}

// The give-backs still in the air.
const giveBacks = new Set<Promise<void>>();

export function track(work: Promise<unknown>): void {
    // Swallowed rather than handled: a give-back is best-effort, and a room that failed to close is the server's to sweep.
    const settled = work.then(() => { }, () => { });

    giveBacks.add(settled);
    void settled.then(() => giveBacks.delete(settled));
}

// Waits for every room this device is in the middle of handing back.
export async function settleGiveBacks(): Promise<void> {
    // A loop rather than one `Promise.all`: a give-back settling can start another.
    while (giveBacks.size > 0) {
        await Promise.all([...giveBacks]);
    }
}
