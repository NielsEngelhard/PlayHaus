import { useAirPlayTable } from '@/features/screen/airplay';
import { useKeepAwake } from 'expo-keep-awake';

// A phone that locks ends its mirror, and the television goes blank with it.
export default function KeepAwakeWhileMirroring({ code }: { code: string }) {
    const airplay = useAirPlayTable(code);

    return airplay.connected ? <KeepAwake /> : null;
}

// A hook that can only be switched on and off by mounting it.
export function KeepAwake() {
    useKeepAwake();
    return null;
}
