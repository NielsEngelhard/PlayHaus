import { type AirPlayTable } from '@/features/screen/airplay-config';

// A web page can only AirPlay a video, never itself, so the browser has nothing to offer here.
export function useAirPlayTable(_code: string): AirPlayTable {
    return { available: false, connected: false };
}
