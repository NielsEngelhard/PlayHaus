import Card from "@/components/ui/Card";
import { Spacing } from "@/constants/theme";
import AuthChoice from "@/features/auth/components/AuthChoice";
import LoginForm from "@/features/auth/components/LoginForm";
import SignupForm from "@/features/auth/components/SignupForm";
import { useAuth } from "@/features/auth/useAuth";
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from "react-native";

type GateView = 'choice' | 'login' | 'signup';

/**
 * The popup that stands in front of the app until you are signed in.
 *
 * Rendered once, from the root layout, rather than per page: the gate is about
 * the session, not about where you happen to be, and mounting it alongside
 * `Slot` means it survives navigation and covers the `Header` and `BottomBar`
 * that sit outside the routed content.
 *
 * The three steps are views inside this one modal rather than routes. The root
 * layout renders a bare `Slot` instead of a navigator, so there is no stack to
 * push onto — and keeping them here means the gate can't be escaped by
 * navigating, which a route-based form could be.
 */
export default function AuthGate() {
    const { status } = useAuth();
    const [view, setView] = useState<GateView>('choice');

    // Gone entirely rather than merely hidden, for two reasons. `restoring` must
    // not open it: on launch we may hold a token and not yet know whether the
    // server still honours it, and showing the popup there would flash it at
    // people who turn out to be signed in already. And unmounting takes the step
    // state with it, so a later logout always reopens on the choice screen
    // instead of half-way through a form somebody walked away from.
    if (status !== 'signedOut') return null;

    return (
        <Modal
            visible
            transparent
            animationType='fade'
            statusBarTranslucent
            // Android's hardware back would otherwise dismiss the gate and leave the
            // app running with no session. There is deliberately no way past this.
            onRequestClose={() => { }}
        >
            <KeyboardAvoidingView
                style={styles.backdrop}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* The signup form plus an on-screen keyboard outgrows a short phone,
                    so the card scrolls rather than clipping its submit button. */}
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps='handled'
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.sheet}>
                        <Card>
                            {view === 'choice' && (
                                <AuthChoice
                                    onLogin={() => setView('login')}
                                    onCreateAccount={() => setView('signup')}
                                />
                            )}

                            {view === 'login' && <LoginForm onBack={() => setView('choice')} />}

                            {view === 'signup' && <SignupForm onBack={() => setView('choice')} />}
                        </Card>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        // Dimmed rather than opaque: the app stays visible behind the gate, so it
        // reads as "not yet" rather than as a different app.
        backgroundColor: 'rgba(15, 13, 18, 0.6)'
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.four
    },
    sheet: {
        width: '100%',
        maxWidth: 420
    }
})
