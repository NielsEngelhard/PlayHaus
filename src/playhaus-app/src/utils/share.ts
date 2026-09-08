// Handing a piece of text — a join link, a room code — to somebody who is not looking at this screen.

import { Share } from 'react-native';

// What actually happened, because the screen says something different about each.
export type ShareOutcome = 'copied' | 'shared' | 'dismissed' | 'failed';

/** Offer a join link through the platform's own share sheet. */
export async function shareLink(url: string, title: string): Promise<ShareOutcome> {
    try {
        // `message` rather than `url`: iOS treats a bare `url` as an attachment.
        const result = await Share.share({ message: url, title }, { dialogTitle: title });

        return result.action === Share.sharedAction ? 'shared' : 'dismissed';
    } catch {
        return 'failed';
    }
}

// Get a short string — the code itself — off this device.
export async function copyText(text: string): Promise<ShareOutcome> {
    try {
        const result = await Share.share({ message: text });

        return result.action === Share.sharedAction ? 'shared' : 'dismissed';
    } catch {
        return 'failed';
    }
}
