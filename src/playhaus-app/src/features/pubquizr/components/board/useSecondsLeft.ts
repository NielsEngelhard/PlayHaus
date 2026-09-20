import { useEffect, useState } from "react";

const TICK_MS = 250;

// A clock some other phone started, counted down to the moment it said -- so every phone agrees to within a tick.
export function useSecondsLeft(endsAt: number | null, seconds: number): number | null {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (endsAt === null) return;

        const tick = setInterval(() => setNow(Date.now()), TICK_MS);

        return () => clearInterval(tick);
    }, [endsAt]);

    if (endsAt === null) return null;

    // Capped, because `now` stood still while no clock was running and is stale for the first tick.
    return Math.min(seconds, Math.max(0, Math.ceil((endsAt - now) / 1000)));
}
