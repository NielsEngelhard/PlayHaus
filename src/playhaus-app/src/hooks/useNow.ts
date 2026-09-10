import { useEffect, useState } from 'react';

// The clock, re-read on an interval, for the few things on screen that go stale on their own.
export function useNow(everyMs: number): Date {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const tick = setInterval(() => setNow(new Date()), everyMs);

        return () => clearInterval(tick);
    }, [everyMs]);

    return now;
}
