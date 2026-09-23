import * as SecureStore from 'expo-secure-store';

import type { OneOfUsPromptMode, OneOfUsPromptPack } from '@/api/calls/one-of-us-prompts';
import type { OneOfUsSingleDeviceGame } from '@/api/calls/one-of-us-single-device';
import { parseOfflineGame, parsePromptPack } from '@/features/one-of-us/offline-game';

// The one game this phone dealt itself. One, like the server, which drops a user's old game the moment they start another.
const GAME_KEY = 'playhaus_oneofus_offline_game';

export async function readOfflineGame(): Promise<OneOfUsSingleDeviceGame | null> {
    try {
        return parseOfflineGame(await SecureStore.getItemAsync(GAME_KEY));
    } catch {
        return null;
    }
}

export async function writeOfflineGame(game: OneOfUsSingleDeviceGame): Promise<void> {
    try {
        await SecureStore.setItemAsync(GAME_KEY, JSON.stringify(game));
    } catch {
    }
}

export async function readPromptPack(locale: string, mode: OneOfUsPromptMode): Promise<OneOfUsPromptPack | null> {
    try {
        return parsePromptPack(await SecureStore.getItemAsync(packKey(locale, mode)));
    } catch {
        return null;
    }
}

export async function writePromptPack(pack: OneOfUsPromptPack): Promise<void> {
    try {
        await SecureStore.setItemAsync(packKey(pack.locale, pack.mode), JSON.stringify(pack));
    } catch {
    }
}

// One pack per language and mode, because a table that switches either needs different lines.
function packKey(locale: string, mode: OneOfUsPromptMode): string {
    return `playhaus_oneofus_prompts_${locale}_${mode}`;
}
