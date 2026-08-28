import { request } from '@/api/client';

export type GameType = 'lol_solo' | 'lol_multiplayer' | 'pq_single_device';

export interface ReconnectableGame {
    id: string
    type: GameType
    createdAt: string
}

export async function getReconnectableGames(): Promise<ReconnectableGame[]> {
    return await request<ReconnectableGame[] | null>('/api/v1/reconnect-games') ?? [];
}
