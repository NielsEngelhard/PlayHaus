import { useEffect, useState } from 'react';

/**
 * A control that cannot be used again for a moment.
 *
 * `start()` blocks straight away and releases `ms` later. Nothing counts down on
 * screen, so this holds one boolean and arms one timer rather than ticking — a
 * control that greys out and comes back needs no clock.
 *
 * Starting again while already cooling down does not extend the wait: the timer
 * belongs to the state, not to the press.
 */
export function useCooldown(ms: number): [boolean, () => void] {
    const [coolingDown, setCoolingDown] = useState(false);

    useEffect(() => {
        if (!coolingDown) return;

        const timer = setTimeout(() => setCoolingDown(false), ms);
        return () => clearTimeout(timer);
    }, [coolingDown, ms]);

    return [coolingDown, () => setCoolingDown(true)];
}
