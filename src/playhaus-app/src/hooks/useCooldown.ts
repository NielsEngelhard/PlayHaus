import { useEffect, useState } from 'react';

// A control that cannot be used again for a moment.
export function useCooldown(ms: number): [boolean, () => void] {
    const [coolingDown, setCoolingDown] = useState(false);

    useEffect(() => {
        if (!coolingDown) return;

        const timer = setTimeout(() => setCoolingDown(false), ms);
        return () => clearTimeout(timer);
    }, [coolingDown, ms]);

    return [coolingDown, () => setCoolingDown(true)];
}
