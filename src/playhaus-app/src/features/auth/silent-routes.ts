// The routes a television opens, where the sign-in sheet would be a username typed on a remote.
const SCREEN_ROUTES = ['/tv', '/games/quizzer/table'];

/** Whether this route belongs to a shared screen. The door needs no account at all, and the room behind it signs itself in. */
export function isScreenRoute(pathname: string): boolean {
    return SCREEN_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));
}
