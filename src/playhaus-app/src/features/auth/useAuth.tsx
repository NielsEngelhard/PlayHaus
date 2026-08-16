import * as authApi from '@/api/calls/auth';
import type { AuthSession, User } from '@/api/calls/auth';
import { setTokenGetter } from '@/api/client';
import { clearToken, readToken, writeToken } from '@/features/auth/token-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * `restoring` is its own state rather than a flavour of signed-out. On launch we
 * hold a token but don't yet know if the server still honours it, and treating
 * that moment as signed-out would flash the login popup at people who are
 * already logged in.
 */
export type AuthStatus = 'restoring' | 'signedIn' | 'signedOut';

interface Auth {
    user: User | null
    status: AuthStatus
    login: (email: string, password: string) => Promise<void>
    signup: (name: string, email: string, password: string) => Promise<void>
    continueAsGuest: () => Promise<void>
    logout: () => Promise<void>
}

/**
 * The token the API client sends, kept at module scope rather than in state.
 *
 * `request` needs it synchronously on every call, including calls fired before
 * the provider has mounted or from outside React entirely. Reading it from
 * storage per request would also mean a keychain round trip each time.
 */
let currentToken: string | null = null;

setTokenGetter(async () => currentToken);

const AuthContext = createContext<Auth | undefined>(undefined);

/**
 * Holds who you are, for the whole app. Wraps everything in the root layout.
 *
 * Sessions are bearer tokens: the backend hands one over on login or guest
 * sign-in, we keep it in the platform's secure store, and it goes out as an
 * `Authorization` header on every request. That is why signing in is more than
 * a state update — the token has to be persisted before the next call is made.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [status, setStatus] = useState<AuthStatus>('restoring');

    // Turn a stored token back into a user, once, on launch.
    useEffect(() => {
        let cancelled = false;

        (async () => {
            const stored = await readToken();
            if (!stored) {
                if (!cancelled) setStatus('signedOut');
                return;
            }

            // Set before the call: `me` is what validates it, and it can only be
            // sent as a bearer token.
            currentToken = stored;

            try {
                const restored = await authApi.me();
                if (cancelled) return;

                setUser(restored);
                setStatus('signedIn');
            } catch {
                // Expired, revoked, or the account is gone. Any of those mean the
                // token is dead weight, so drop it rather than retrying forever.
                // A backend that is merely unreachable lands here too — the cost
                // is one re-login, which beats hanging on the splash screen.
                currentToken = null;
                await clearToken();

                if (cancelled) return;
                setStatus('signedOut');
            }
        })();

        return () => { cancelled = true; };
    }, []);

    /** Everything that starts a session ends here, so persistence can't be forgotten. */
    const adopt = useCallback(async (session: AuthSession) => {
        currentToken = session.token;
        await writeToken(session.token);

        setUser(session.user);
        setStatus('signedIn');
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        await adopt(await authApi.login(email, password));
    }, [adopt]);

    /**
     * Signing up signs you in: the backend answers with a session rather than
     * just the new account, so there is no second call and no moment where the
     * account exists but nobody is logged into it. Errors reach the form
     * unchanged — it needs the message to show you.
     */
    const signup = useCallback(async (name: string, email: string, password: string) => {
        await adopt(await authApi.signup(name, email, password));
    }, [adopt]);

    /** A guest is named by the backend, so there is nothing to pass. */
    const continueAsGuest = useCallback(async () => {
        await adopt(await authApi.createGuest());
    }, [adopt]);

    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } catch {
            // Revoking server-side is best effort. Failing to reach the API must
            // not strand you inside a session you asked to leave: the token is
            // dropped locally regardless, and the server's copy expires on its own.
        }

        currentToken = null;
        await clearToken();

        setUser(null);
        setStatus('signedOut');
    }, []);

    const value = useMemo(
        () => ({ user, status, login, signup, continueAsGuest, logout }),
        [user, status, login, signup, continueAsGuest, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Read the current session and the actions that change it.
 *
 * Unlike `useHeaderTag` this throws instead of falling back to a harmless
 * default: a no-op default here would make `login()` appear to succeed while
 * doing nothing, which is far harder to spot than a missing provider.
 */
export function useAuth(): Auth {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used inside an AuthProvider');
    }

    return context;
}
