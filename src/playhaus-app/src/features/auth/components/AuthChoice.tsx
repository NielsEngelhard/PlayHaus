import AppText from "@/components/text/AppText";
import TextButton from "@/components/ui/TextButton";
import { Colors, FontSizes, Spacing } from "@/constants/theme";
import { authErrorMessage } from "@/features/auth/auth-errors";
import AuthErrorText from "@/features/auth/components/AuthErrorText";
import { useAuth } from "@/features/auth/useAuth";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

interface Props {
    onLogin: () => void
    onCreateAccount: () => void
}

/**
 * The gate's first screen: the three ways into the app, stacked.
 *
 * Two of them only switch the view, but "Continue as Guest" signs you in from
 * here — there is no form to fill in — so this is the one screen of the three
 * that owns a request and its failure.
 */
export default function AuthChoice({ onLogin, onCreateAccount }: Props) {
    const { continueAsGuest } = useAuth();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function guest() {
        setBusy(true);
        setError(null);

        try {
            await continueAsGuest();
            // No `setBusy(false)` on success: signing in closes the gate and unmounts
            // this view, and the button should stay disabled for the moment in between.
        } catch (failure) {
            setError(authErrorMessage(failure));
            setBusy(false);
        }
    }

    return (
        <View>
            <AppText style={styles.title}>Welcome to Playhaus</AppText>

            <AppText style={styles.subtitle}>
                Sign in to keep your name, your friends and your games. Or jump
                straight in as a guest.
            </AppText>

            {error && <AuthErrorText message={error} />}

            <View style={styles.buttons}>
                <TextButton
                    text='Login'
                    onPress={onLogin}
                    variant='secondary'
                    fullWidth
                    disabled={busy}
                />

                <TextButton
                    text='Create Account'
                    onPress={onCreateAccount}
                    variant='primary'
                    fullWidth
                    disabled={busy}
                />

                {/* Muted on purpose: available, but not the road being recommended. */}
                <TextButton
                    text={busy ? 'One moment…' : 'Continue as Guest'}
                    onPress={guest}
                    variant='muted'
                    fullWidth
                    disabled={busy}
                />
            </View>

            <AppText style={styles.hint}>
                A guest account is temporary
            </AppText>
        </View>
    )
}

const styles = StyleSheet.create({
    title: {
        fontSize: FontSizes.xxl,
        fontWeight: 900
    },
    subtitle: {
        marginTop: Spacing.two,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: Colors.light.textSecondary
    },
    buttons: {
        marginTop: Spacing.four,
        // The three sit under each other, not in a row: they are alternatives, and a
        // column gives each one a full-width tap target.
        flexDirection: 'column',
        gap: Spacing.three
    },
    hint: {
        marginTop: Spacing.four,
        fontSize: FontSizes.xs,
        lineHeight: FontSizes.xs * 1.45,
        color: Colors.light.textSecondary
    }
})
