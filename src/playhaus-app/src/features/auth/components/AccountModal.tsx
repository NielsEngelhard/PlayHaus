import AccountChoice from "@/features/auth/components/AccountChoice";
import AuthSheet from "@/features/auth/components/AuthSheet";
import LoginForm from "@/features/auth/components/LoginForm";
import SignupForm from "@/features/auth/components/SignupForm";
import { useState } from "react";

type ModalView = 'account' | 'login' | 'signup';

interface Props {
    visible: boolean
    /** Called on the way out, whether that was a sign-in or a change of mind. */
    onClose: () => void
}

/**
 * The gate's account steps — login or signup — offered from inside a session
 * rather than in front of one.
 *
 * A guest is signed in already, so this is an invitation instead of a barrier:
 * it opens on the fork rather than on the gate's guest-or-account screen, the
 * back arrow leads out of it rather than one step further in, and signing in has
 * to close it, since it is not the gate and nothing unmounts it on its own.
 *
 * Signing up here starts a fresh account. The backend has no route that turns a
 * guest into a full user, so the guest's games do not come along — which is
 * exactly what the notice that opens this is warning about.
 */
export default function AccountModal({ visible, onClose }: Props) {
    if (!visible) return null;

    // Keyed on nothing, but remounted with the sheet: the early return above
    // throws this away on close, so reopening always lands on the fork rather
    // than half-way through a form somebody walked away from.
    return <AccountModalSheet onClose={onClose} />;
}

function AccountModalSheet({ onClose }: { onClose: () => void }) {
    const [view, setView] = useState<ModalView>('account');

    return (
        <AuthSheet onRequestClose={onClose}>
            {view === 'account' && (
                <AccountChoice
                    onLogin={() => setView('login')}
                    onCreateAccount={() => setView('signup')}
                    // One step back from the fork is out — there is no screen
                    // before it here.
                    onBack={onClose}
                />
            )}

            {view === 'login' && (
                <LoginForm onBack={() => setView('account')} onSuccess={onClose} />
            )}

            {view === 'signup' && (
                <SignupForm onBack={() => setView('account')} onSuccess={onClose} />
            )}
        </AuthSheet>
    )
}
