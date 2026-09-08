// Dev mode: the shortcuts that make a game quick to sit through while it is being worked on.
export const DEV_MODE: boolean = ['1', 'true'].includes(
    (process.env.EXPO_PUBLIC_DEV_MODE ?? '').trim().toLowerCase()
);
