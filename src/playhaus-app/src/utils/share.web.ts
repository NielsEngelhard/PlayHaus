/**
 * Web half of the share helpers — see `share.ts` for the contract and for why these
 * are split at all.
 *
 * The browser is the mirror image of the phone: `navigator.clipboard` is everywhere,
 * while `navigator.share` only exists on mobile browsers and only over https. So a
 * copy really is a copy here, and a share falls back to one rather than to nothing.
 */

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
            // The only rejection worth telling apart: everything else is a browser that
            // said it could share and then could not, which the clipboard below covers.
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
        // Denied permission, or an insecure origin. Either way there is nothing else to
        // try — the legacy `execCommand` path is gone from the browsers that matter.
        return 'failed';
    }
}
