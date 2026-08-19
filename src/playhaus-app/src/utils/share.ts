/**
 * Handing a piece of text — a join link, a room code — to somebody who is not looking
 * at this screen.
 *
 * Split by platform because the two halves have opposite strengths and this app ships
 * to both. Native has a share sheet built into React Native and no clipboard at all:
 * `Clipboard` left core years ago and nothing has replaced it here, so a "copy" on a
 * phone is really a share. The browser is the other way round — see `share.web.ts`.
 *
 * Deliberately no new dependency. `expo-clipboard` would even the two up, at the cost
 * of a native rebuild for one icon on one screen; the share sheet is the better answer
 * on a phone anyway, since the person you are inviting is in one of the apps it lists.
 */

import { Share } from 'react-native';

/**
 * What actually happened, because the screen says something different about each.
 *
 * `dismissed` is not a failure: closing the share sheet is a perfectly good answer,
 * and it must not put an error on a screen the player is happy with.
 */
export type ShareOutcome = 'copied' | 'shared' | 'dismissed' | 'failed';

/** Offer a join link through the platform's own share sheet. */
export async function shareLink(url: string, title: string): Promise<ShareOutcome> {
    try {
        // `message` rather than `url`: iOS treats a bare `url` as an attachment, which
        // some targets drop entirely, and every one of them handles a link in the text.
        const result = await Share.share({ message: url, title }, { dialogTitle: title });

        return result.action === Share.sharedAction ? 'shared' : 'dismissed';
    } catch {
        return 'failed';
    }
}

/**
 * Get a short string — the code itself — off this device.
 *
 * The share sheet again, for want of a clipboard. It reads oddly next to a copy icon,
 * so the caller is told which of the two happened and labels the control after the
 * fact rather than promising a copy it cannot make.
 */
export async function copyText(text: string): Promise<ShareOutcome> {
    try {
        const result = await Share.share({ message: text });

        return result.action === Share.sharedAction ? 'shared' : 'dismissed';
    } catch {
        return 'failed';
    }
}
