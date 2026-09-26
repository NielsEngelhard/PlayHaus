// Both must match `app.json`'s google-cast plugin and `public/cast-receiver.html`; the App ID is the console's.
export const CAST_APP_ID = '1AE332C1';
export const CAST_NAMESPACE = 'urn:x-cast:com.playhaus.quiz';

export interface CastTable {
    available: boolean
    connected: boolean
    show: () => void
}
