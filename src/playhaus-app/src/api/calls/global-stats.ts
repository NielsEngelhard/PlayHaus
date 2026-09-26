import { request } from '@/api/client';

export interface GamesPlayedStats {
    ffPlayed: number
    lolMpPlayed: number
    lolSoloPlayed: number
    lolWodPlayed: number
    oouMultiDevicePlayed: number
    oouSingleDevicePlayed: number
    qzMultiDevicePlayed: number
    qzMultiDeviceWithHostScreenPlayed: number
    qzSingleDevicePlayed: number
    wwPlayed: number
}

export async function getGamesPlayedStats(): Promise<GamesPlayedStats> {
    return await request<GamesPlayedStats>('/api/v1/stats/games-played');
}
