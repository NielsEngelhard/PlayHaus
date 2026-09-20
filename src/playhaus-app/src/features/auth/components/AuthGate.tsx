import type { LanguageCode } from "@/constants/languages";
import AuthSheet from "@/features/auth/components/AuthSheet";
import GuestLanguageChoice from "@/features/auth/components/GuestLanguageChoice";
import GuestUsernameChoice from "@/features/auth/components/GuestUsernameChoice";
import LoginForm from "@/features/auth/components/LoginForm";
import SignupForm from "@/features/auth/components/SignupForm";
import { isScreenRoute } from "@/features/auth/silent-routes";
import { useAuth } from "@/features/auth/useAuth";
import { usePathname } from "expo-router";
import { useState } from "react";

type GateView = 'guest' | 'username' | 'login' | 'signup';

// The popup that stands in front of the app until you are signed in.
export default function AuthGate() {
    const { status } = useAuth();
    const pathname = usePathname();

    // Gone entirely rather than merely hidden, for two reasons.
    if (status !== 'signedOut') return null;

    // A shared screen never sees the sheet: the door needs no account, and the room behind it signs itself in.
    if (isScreenRoute(pathname)) return null;

    return <AuthGateSheet />;
}

function AuthGateSheet() {
    // Opens on the language grid; the username step after it is what actually signs you in.
    const [view, setView] = useState<GateView>('guest');
    const [locale, setLocale] = useState<LanguageCode | null>(null);

    return (
        // No `onRequestClose`: Android's hardware back would otherwise dismiss the gate and leave the app running with no session.
        <AuthSheet>
            {/* No `onBack` — this is the first screen, and there is nothing behind it. */}
            {view === 'guest' && (
                <GuestLanguageChoice
                    onLogin={() => setView('login')}
                    onNext={chosen => {
                        setLocale(chosen);
                        setView('username');
                    }}
                />
            )}

            {view === 'username' && locale !== null && (
                <GuestUsernameChoice locale={locale} onBack={() => setView('guest')} />
            )}

            {view === 'login' && (
                <LoginForm
                    onBack={() => setView('guest')}
                    onSignup={() => setView('signup')}
                />
            )}

            {/* Back goes to the login form, not all the way out: it undoes the last choice made rather than the whole trip. */}
            {view === 'signup' && <SignupForm onBack={() => setView('login')} />}
        </AuthSheet>
    )
}
