// Web half of the share helpers — see `share.ts` for the contract and for why these are split at all.

export type ShareOutcome = 'copied' | 'shared' | 'dismissed' | 'failed';

/** True when the browser has the API *and* is allowed to use it. */
function canShare(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

function canCopy(): boolean {
    return typeof navigator !== 'undefined' && navigator.clipboard !== undefined;
}

export async function shareLink(url: string, title: string): Promise<ShareOutcome> {
    if (canShare()) {
        try {
            await navigator.share({ url, title });

            return 'shared';
        } catch (failure) {
            // The only rejection worth telling apart.
            if (failure instanceof Error && failure.name === 'AbortError') return 'dismissed';
        }
    }

    return copyText(url);
}

export async function copyText(text: string): Promise<ShareOutcome> {
    if (!canCopy()) return 'failed';

    try {
        await navigator.clipboard.writeText(text);

        return 'copied';
    } catch {
        // Denied permission, or an insecure origin.
        return 'failed';
    }
}
