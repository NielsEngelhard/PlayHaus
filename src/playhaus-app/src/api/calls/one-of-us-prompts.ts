import { request } from "../client";

// Mirrors oneofus.GameMode: the kind of line a table is dealt.
export type OneOfUsPromptMode = 'sentence' | 'word';

// The two lines one game turns on — what the civilians are given, and what the imposters get instead.
export interface OneOfUsPromptPair {
    actual: string;
    imposter: string;
}

export interface OneOfUsPromptPack {
    locale: string;
    mode: OneOfUsPromptMode;
    pairs: OneOfUsPromptPair[];
}

export function promptModeFor(wordOnly: boolean): OneOfUsPromptMode {
    return wordOnly ? 'word' : 'sentence';
}

// A pack of pairs to keep, so a table can still be dealt with no network to deal it.
export async function getOneOfUsPrompts(locale: string, mode: OneOfUsPromptMode, count: number): Promise<OneOfUsPromptPack | null> {
    return await request<OneOfUsPromptPack | null>(`/api/v1/one-of-us/prompts/${locale}/${mode}?count=${count}`) ?? null;
}
