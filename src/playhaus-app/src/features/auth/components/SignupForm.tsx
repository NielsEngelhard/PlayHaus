import AppText from "@/components/text/AppText";
import TextButton from "@/components/ui/TextButton";
import TextField from "@/components/ui/TextField";
import { Colors, FontSizes, Spacing } from "@/constants/theme";
import { authErrorMessage } from "@/features/auth/auth-errors";
import AuthErrorText from "@/features/auth/components/AuthErrorText";
import AuthFormHeader from "@/features/auth/components/AuthFormHeader";
import { useAuth } from "@/features/auth/useAuth";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

interface Props {
    onBack: () => void
}

/**
 * Creates an account and signs straight into it — one call, since the API
 * answers a signup with a session.
 */
export default function SignupForm({ onBack }: Props) {
    const { signup } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canSubmit = name.trim().length > 0
        && email.trim().length > 0
        && password.length > 0
        && !busy;

    async function submit() {
        if (!canSubmit) return;

        const trimmedEmail = email.trim();

        // Checked on submit rather than folded into `canSubmit`: a button that
        // stays greyed out until you happen to type an `@` explains nothing.
        if (!trimmedEmail.includes('@')) {
            setError('That doesn’t look like an email address.');
            return;
        }

        setBusy(true);
        setError(null);

        try {
            await signup(name.trim(), trimmedEmail, password);
        } catch (failure) {
            setError(authErrorMessage(failure));
            setBusy(false);
        }
    }

    return (
        <View>
            <AuthFormHeader title='Sign Up' onBack={onBack} disabled={busy} />

            <TextField
                label='Player name'
                value={name}
                onChangeText={setName}
                placeholder='Your name'
                autoCapitalize='words'
                autoComplete='name'
                textContentType='name'
                returnKeyType='next'
                editable={!busy}
                autoFocus
                style={styles.field}
            />

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
                style={styles.field}
            />

            <TextField
                label='Password'
                value={password}
                onChangeText={setPassword}
                placeholder='Pick a password'
                secureTextEntry
                autoComplete='new-password'
                textContentType='newPassword'
                returnKeyType='go'
                onSubmitEditing={submit}
                editable={!busy}
                style={styles.field}
            />

            {error && <AuthErrorText message={error} />}

            <TextButton
                text={busy ? 'Creating…' : 'Create Account'}
                onPress={submit}
                variant='primary'
                fullWidth
                disabled={!canSubmit}
                style={styles.submit}
            />

            <AppText style={styles.hint}>
                This is the name other players see in a room. You can change it
                later in your profile.
            </AppText>
        </View>
    )
}

const styles = StyleSheet.create({
    field: {
        marginTop: Spacing.four
    },
    submit: {
        marginTop: Spacing.four
    },
    hint: {
        marginTop: Spacing.three,
        fontSize: FontSizes.xs,
        lineHeight: FontSizes.xs * 1.45,
        color: Colors.light.textSecondary
    }
})
