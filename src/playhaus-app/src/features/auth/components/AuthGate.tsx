import AuthSheet from "@/features/auth/components/AuthSheet";
import GuestLanguageChoice from "@/features/auth/components/GuestLanguageChoice";
import LoginForm from "@/features/auth/components/LoginForm";
import SignupForm from "@/features/auth/components/SignupForm";
import { useAuth } from "@/features/auth/useAuth";
import { useState } from "react";

type GateView = 'guest' | 'login' | 'signup';

/**
 * The popup that stands in front of the app until you are signed in.
 *
 * Rendered once, from the root layout, rather than per page: the gate is about
 * the session, not about where you happen to be, and mounting it alongside
 * `Slot` means it survives navigation and covers the `Header` and `BottomBar`
 * that sit outside the routed content.
 *
 * The steps are views inside this one modal rather than routes. The root
 * layout renders a bare `Slot` instead of a navigator, so there is no stack to
 * push onto — and keeping them here means the gate can't be escaped by
 * navigating, which a route-based form could be.
 */
export default function AuthGate() {
    const { status } = useAuth();

    // Gone entirely rather than merely hidden, for two reasons. `restoring` must
    // not open it: on launch we may hold a token and not yet know whether the
    // server still honours it, and showing the popup there would flash it at
    // people who turn out to be signed in already. And the step state lives one
    // component further in, so signing in unmounts it along with the sheet and a
    // later logout always reopens on the language grid rather than half-way
    // through a form somebody walked away from. Returning null from up here
    // would not do that — React keeps a component that renders nothing, and its
    // state with it.
    if (status !== 'signedOut') return null;

    return <AuthGateSheet />;
}

function AuthGateSheet() {
    /**
     * Opens on the language grid, which is also what signs you in.
     *
     * There used to be a fork in front of it asking account-or-guest. Nobody needs to
     * answer that before playing any more: a guest account is what everyone starts
     * with, and turning one into a real account is a page on the profile rather than a
     * different way in. So the first screen is the one decision that actually has to be
     * made — the language — and the two forms behind it are for the minority who are
     * coming back to an account they already have.
     */
    const [view, setView] = useState<GateView>('guest');

    return (
        // No `onRequestClose`: Android's hardware back would otherwise dismiss the
        // gate and leave the app running with no session. There is deliberately no
        // way past this one.
        <AuthSheet>
            {/* No `onBack` — this is the first screen, and there is nothing behind it. */}
            {view === 'guest' && <GuestLanguageChoice onLogin={() => setView('login')} />}

            {view === 'login' && (
                <LoginForm
                    onBack={() => setView('guest')}
                    onSignup={() => setView('signup')}
                />
            )}

            {/* Back goes to the login form, not all the way out: it undoes the last
                choice made rather than the whole trip. */}
            {view === 'signup' && <SignupForm onBack={() => setView('login')} />}
        </AuthSheet>
    )
}
