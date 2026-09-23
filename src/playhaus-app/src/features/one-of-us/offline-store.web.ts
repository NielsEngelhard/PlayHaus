import type { OneOfUsPromptMode, OneOfUsPromptPack } from '@/api/calls/one-of-us-prompts';
import type { OneOfUsSingleDeviceGame } from '@/api/calls/one-of-us-single-device';
import { parseOfflineGame, parsePromptPack } from '@/features/one-of-us/offline-game';

// The web half of `offline-store.ts`.
const GAME_KEY = 'playhaus_oneofus_offline_game';

function storage(): Storage | null {
    if (typeof window === 'undefined') return null;

    try {
        return window.localStorage;
    } catch {
        // Safari in private mode, and any browser with site data blocked, throws on the property itself.
        return null;
    }
}

export async function readOfflineGame(): Promise<OneOfUsSingleDeviceGame | null> {
    return parseOfflineGame(storage()?.getItem(GAME_KEY));
}

export async function writeOfflineGame(game: OneOfUsSingleDeviceGame): Promise<void> {
    try {
        storage()?.setItem(GAME_KEY, JSON.stringify(game));
    } catch {
        // Over quota, or a store that reads fine and refuses writes.
    }
}

export async function readPromptPack(locale: string, mode: OneOfUsPromptMode): Promise<OneOfUsPromptPack | null> {
    return parsePromptPack(storage()?.getItem(packKey(locale, mode)));
}

export async function writePromptPack(pack: OneOfUsPromptPack): Promise<void> {
    try {
        storage()?.setItem(packKey(pack.locale, pack.mode), JSON.stringify(pack));
    } catch {
    }
}

function packKey(locale: string, mode: OneOfUsPromptMode): string {
    return `playhaus_oneofus_prompts_${locale}_${mode}`;
}
