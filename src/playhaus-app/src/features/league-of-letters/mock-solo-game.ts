import type { SoloSettings } from "@/features/league-of-letters/solo-settings";

/**
 * Stand-in for creating a solo game. The API has no create endpoint yet — it only
 * exposes `GET /api/v1/league-of-letters/words/random?lang=&length=` — so nothing
 * leaves the device and no game is persisted.
 *
 * Swap the body for a `request<SoloGame>('/api/v1/league-of-letters/solo', …)` call
 * (see `src/api/client.ts`) once the endpoint lands; the signature is already the
 * shape that call will have.
 */

export interface SoloGame {
    gameId: string
}

/** Long enough that the button's pending state is actually seen rather than flickering. */
const FAKE_LATENCY_MS = 600;

export async function createSoloGame(settings: SoloSettings): Promise<SoloGame> {
    await new Promise(resolve => setTimeout(resolve, FAKE_LATENCY_MS));

    // `settings` goes unread until there's a server to send it to — it's here because
    // the real call takes it.
    void settings;

    return { gameId: Math.random().toString(36).slice(2, 10) };
}
