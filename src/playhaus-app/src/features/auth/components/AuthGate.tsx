import AuthSheet from "@/features/auth/components/AuthSheet";
import GuestLanguageChoice from "@/features/auth/components/GuestLanguageChoice";
import LoginForm from "@/features/auth/components/LoginForm";
import SignupForm from "@/features/auth/components/SignupForm";
import { useAuth } from "@/features/auth/useAuth";
import { useState } from "react";

type GateView = 'guest' | 'login' | 'signup';

// The popup that stands in front of the app until you are signed in.
export default function AuthGate() {
    const { status } = useAuth();

    // Gone entirely rather than merely hidden, for two reasons.
    if (status !== 'signedOut') return null;

    return <AuthGateSheet />;
}

function AuthGateSheet() {
    // Opens on the language grid, which is also what signs you in.
    const [view, setView] = useState<GateView>('guest');

    return (
        // No `onRequestClose`: Android's hardware back would otherwise dismiss the gate and leave the app running with no session.
        <AuthSheet>
            {/* No `onBack` — this is the first screen, and there is nothing behind it. */}
            {view === 'guest' && <GuestLanguageChoice onLogin={() => setView('login')} />}

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
