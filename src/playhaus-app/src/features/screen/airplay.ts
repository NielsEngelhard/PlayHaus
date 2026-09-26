import { type AirPlayTable } from '@/features/screen/airplay-config';
import { webUrl } from '@/features/screen/screen-url';
import { requireOptionalNativeModule } from 'expo';
import { useEffect, useState } from 'react';

interface ExternalScreenModule {
    addListener: (event: 'onChange', listener: (event: { connected: boolean }) => void) => { remove: () => void }
    isConnected: () => Promise<boolean>
    show: (url: string) => Promise<void>
}

// Only the iOS build carries it: Android, Expo Go and an older dev build all come back null.
const ExternalScreen = requireOptionalNativeModule<ExternalScreenModule>('ExternalScreen');

// Hands the board's address to the native side, which draws it on whatever screen AirPlay mirroring attaches.
export function useAirPlayTable(code: string): AirPlayTable {
    const site = webUrl();
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (ExternalScreen === null) return;

        let mounted = true;
        void ExternalScreen.isConnected().then(found => { if (mounted) setConnected(found); }).catch(() => { });

        const subscription = ExternalScreen.addListener('onChange', event => setConnected(event.connected));

        return () => {
            mounted = false;
            subscription.remove();
        };
    }, []);

    useEffect(() => {
        if (ExternalScreen === null || site === null) return;

        void ExternalScreen.show(`${site}/tv/${code}`).catch(() => { });
    }, [site, code]);

    return { available: ExternalScreen !== null && site !== null, connected };
}
