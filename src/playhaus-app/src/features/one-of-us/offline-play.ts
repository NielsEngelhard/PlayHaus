import { getOneOfUsPrompts, type OneOfUsPromptMode } from '@/api/calls/one-of-us-prompts';
import type { OneOfUsSingleDeviceGame } from '@/api/calls/one-of-us-single-device';
import type { OneOfUsRole } from '@/features/one-of-us/models';
import { dealOfflineGame } from '@/features/one-of-us/offline-game';
import { readPromptPack, writeOfflineGame, writePromptPack } from '@/features/one-of-us/offline-store';

// How many pairs one fetch keeps back, which is also as many as the API will hand over at once.
const PACK_SIZE = 50;

export interface OfflineStartInput {
    enabledRoles: OneOfUsRole[]
    locale: string
    mode: OneOfUsPromptMode
    ownerId: string
    playerNames: string[]
}

// Tops the pack up for the language and mode a table just played in. Silent on purpose: a game that has already started does not need to hear that this failed.
export async function cachePrompts(locale: string, mode: OneOfUsPromptMode): Promise<void> {
    try {
        const pack = await getOneOfUsPrompts(locale, mode, PACK_SIZE);
        if (pack === null || pack.pairs.length === 0) return;

        await writePromptPack(pack);
    } catch {
    }
}

// Fills the pack when this phone has none, so the first game away from the network is not the one that discovers the cupboard is bare.
export async function ensurePrompts(locale: string, mode: OneOfUsPromptMode): Promise<void> {
    const kept = await readPromptPack(locale, mode);
    if (kept !== null && kept.pairs.length > 0) return;

    await cachePrompts(locale, mode);
}

// Deals and stores a game off the kept pack, or null when this phone has no pairs for that language and mode.
export async function startOfflineGame(input: OfflineStartInput): Promise<OneOfUsSingleDeviceGame | null> {
    const pack = await readPromptPack(input.locale, input.mode);
    if (pack === null || pack.pairs.length === 0) return null;

    const [pair, ...rest] = pack.pairs;

    const game = dealOfflineGame({
        enabledRoles: input.enabledRoles,
        locale: input.locale,
        ownerId: input.ownerId,
        pair,
        playerNames: input.playerNames
    });

    await writeOfflineGame(game);

    // Spent, so the next game away from the network is a different one. The last pair stays put rather than leaving a table with nothing to play.
    if (rest.length > 0) await writePromptPack({ ...pack, pairs: rest });

    return game;
}
