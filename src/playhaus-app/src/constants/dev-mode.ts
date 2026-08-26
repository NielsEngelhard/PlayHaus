/**
 * Dev mode: the shortcuts that make a game quick to sit through while it is being worked
 * on. Off in anything anyone else runs.
 *
 * Read from `EXPO_PUBLIC_DEV_MODE` rather than a bare `DEV_MODE` because Metro only
 * inlines `EXPO_PUBLIC_`-prefixed variables into the bundle — an unprefixed one is simply
 * `undefined` on a device, which is a shortcut that silently stops working rather than
 * one that is off. Off is also what an unset or unparseable value means: a build that
 * shipped without the variable must not ship the shortcuts.
 */
export const DEV_MODE: boolean = ['1', 'true'].includes(
    (process.env.EXPO_PUBLIC_DEV_MODE ?? '').trim().toLowerCase()
);
