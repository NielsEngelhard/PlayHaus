import { request } from '@/api/client';

export type GameType = 'lol_solo' | 'lol_multiplayer' | 'lol_tournament' | 'pq_single_device' | 'pq_multi_device' | 'oou_single_device' | 'oou_multi_device' | 'ff_multiplayer' | 'ww_multiplayer';

export interface ReconnectableGame {
    id: string
    type: GameType
    createdAt: string
}

export async function getReconnectableGames(): Promise<ReconnectableGame[]> {
    return await request<ReconnectableGame[] | null>('/api/v1/reconnect-games') ?? [];
}
