import TextButton from "@/components/ui/TextButton";
import TextField from "@/components/ui/TextField";
import { Spacing } from "@/constants/theme";
import { authErrorMessage } from "@/features/auth/auth-errors";
import AuthErrorText from "@/features/auth/components/AuthErrorText";
import AuthFormHeader from "@/features/auth/components/AuthFormHeader";
import { useAuth } from "@/features/auth/useAuth";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

interface Props {
    onBack: () => void
}

/** Signs an existing account in. Reached from the gate's choice screen. */
export default function LoginForm({ onBack }: Props) {
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Only emptiness is refused here. Whether the credentials are right is the
    // server's answer to give, and guessing at it locally just adds a second
    // opinion that can disagree.
    const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

    async function submit() {
        if (!canSubmit) return;

        setBusy(true);
        setError(null);

        try {
            await login(email.trim(), password);
            // Success unmounts this form along with the gate, so nothing to reset.
        } catch (failure) {
            setError(authErrorMessage(failure));
            setBusy(false);
        }
    }

    return (
        <View>
            <AuthFormHeader title='Login' onBack={onBack} disabled={busy} />

            <TextField
                label='Email'
                value={email}
                onChangeText={setEmail}
                placeholder='you@example.com'
                keyboardType='email-address'
                autoComplete='email'
                textContentType='emailAddress'
                returnKeyType='next'
                editable={!busy}
                autoFocus
                style={styles.field}
            />

            <TextField
                label='Password'
                value={password}
                onChangeText={setPassword}
                placeholder='Your password'
                secureTextEntry
                autoComplete='current-password'
                textContentType='password'
                returnKeyType='go'
                onSubmitEditing={submit}
                editable={!busy}
                style={styles.field}
            />

            {error && <AuthErrorText message={error} />}

            <TextButton
                text={busy ? 'Signing in…' : 'Login'}
                onPress={submit}
                variant='secondary'
                fullWidth
                disabled={!canSubmit}
                style={styles.submit}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    field: {
        marginTop: Spacing.four
    },
    submit: {
        marginTop: Spacing.four
    }
})
