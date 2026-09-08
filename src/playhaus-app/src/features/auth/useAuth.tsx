import * as authApi from '@/api/calls/auth';
import type { AuthSession, User } from '@/api/calls/auth';
import { setTokenGetter } from '@/api/client';
import type { LanguageCode } from '@/constants/languages';
import { clearToken, readToken, writeToken } from '@/features/auth/token-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// `restoring` is its own state rather than a flavour of signed-out.
export type AuthStatus = 'restoring' | 'signedIn' | 'signedOut';

interface Auth {
    user: User | null
    status: AuthStatus
    login: (email: string, password: string) => Promise<void>
    signup: (name: string, email: string, password: string) => Promise<void>
    // The language is the only thing a guest chooses, and it is asked for before the account exists rather than corrected in the profile afterwards.
    continueAsGuest: (locale: LanguageCode) => Promise<void>
    // Turns the guest you are already signed in as into a real account, keeping the name, the colour and the games.
    upgradeGuest: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
    // Writes fields onto the session's copy of the user.
    patchUser: (fields: Partial<User>) => void
}

// The token the API client sends, kept at module scope rather than in state.
let currentToken: string | null = null;

// The stored token being read back into `currentToken`, started at import rather than from the provider's effect below and awaited by the getter.
const tokenRestored: Promise<void> = readToken()
    .then(stored => {
        if (stored !== null && currentToken === null) currentToken = stored;
    })
    .catch(() => {
        // A store that will not open is a session that cannot be restored.
    });

setTokenGetter(async () => {
    await tokenRestored;
    return currentToken;
});

// The session token, for callers that are not `request`.
export function sessionToken(): string | null {
    return currentToken;
}

const AuthContext = createContext<Auth | undefined>(undefined);

// Holds who you are, for the whole app.
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [status, setStatus] = useState<AuthStatus>('restoring');

    // Turn a stored token back into a user, once, on launch.
    useEffect(() => {
        let cancelled = false;

        (async () => {
            // The read is already in flight from module scope, and installing what it finds is its job rather than this one's.
            await tokenRestored;

            if (currentToken === null) {
                if (!cancelled) setStatus('signedOut');
                return;
            }

            try {
                const account = await authApi.me();
                if (cancelled) return;

                setUser(account);
                setStatus('signedIn');
            } catch {
                // Expired, revoked, or the account is gone.
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

    // Signing up signs you in: the backend answers with a session rather than just the new account.
    const signup = useCallback(async (name: string, email: string, password: string) => {
        await adopt(await authApi.signup(name, email, password));
    }, [adopt]);

    /** A guest is named by the backend, from the language passed in here. */
    const continueAsGuest = useCallback(async (locale: LanguageCode) => {
        await adopt(await authApi.createGuest(locale));
    }, [adopt]);

    // Only the user is touched, never the status.
    const patchUser = useCallback((fields: Partial<User>) => {
        setUser(current => current === null ? null : { ...current, ...fields });
    }, []);

    // Not `adopt`, unlike everything above it: the account changes kind but the session does not change at all.
    const upgradeGuest = useCallback(async (email: string, password: string) => {
        const normalized = email.trim().toLowerCase();

        await authApi.upgradeGuest(normalized, password);
        patchUser({ isGuest: false, email: normalized });
    }, [patchUser]);

    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } catch {
            // Revoking server-side is best effort.
        }

        currentToken = null;
        await clearToken();

        setUser(null);
        setStatus('signedOut');
    }, []);

    const value = useMemo(
        () => ({ user, status, login, signup, continueAsGuest, upgradeGuest, logout, patchUser }),
        [user, status, login, signup, continueAsGuest, upgradeGuest, logout, patchUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Read the current session and the actions that change it.
export function useAuth(): Auth {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used inside an AuthProvider');
    }

    return context;
}
