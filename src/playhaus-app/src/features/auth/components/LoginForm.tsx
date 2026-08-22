import TextButton from "@/components/ui/TextButton";
import TextField from "@/components/ui/TextField";
import { Spacing } from "@/constants/theme";
import { authErrorMessage } from "@/features/auth/auth-errors";
import AuthErrorText from "@/features/auth/components/AuthErrorText";
import AuthFormHeader from "@/features/auth/components/AuthFormHeader";
import { useAuth } from "@/features/auth/useAuth";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

interface Props {
    onBack: () => void
    /**
     * The way on to `SignupForm`, for somebody who came looking for a login and does
     * not have one. Optional because it is the *only* remaining door to signing up
     * from scratch, and a caller that does not want that door open should not have to
     * hide it afterwards.
     */
    onSignup?: () => void
    /**
     * Only needed where signing in does not take this form off screen with it.
     * The gate unmounts on its own the moment the session starts.
     */
    onSuccess?: () => void
}

/** Signs an existing account in. Reached from the gate's language screen. */
export default function LoginForm({ onBack, onSignup, onSuccess }: Props) {
    const { login } = useAuth();
    const t = useT();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<TranslationKey | null>(null);

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
            // Nothing to reset either way: in the gate success unmounts this form,
            // and everywhere else `onSuccess` is what closes the sheet around it.
            onSuccess?.();
        } catch (failure) {
            setError(authErrorMessage(failure));
            setBusy(false);
        }
    }

    return (
        <View>
            <AuthFormHeader title={t('auth.login.title')} onBack={onBack} disabled={busy} />

            <TextField
                label={t('auth.login.email')}
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.login.emailPlaceholder')}
                keyboardType='email-address'
                autoComplete='email'
                textContentType='emailAddress'
                returnKeyType='next'
                editable={!busy}
                autoFocus
                style={styles.field}
            />

            <TextField
                label={t('auth.login.password')}
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.login.passwordPlaceholder')}
                secureTextEntry
                autoComplete='current-password'
                textContentType='password'
                returnKeyType='go'
                onSubmitEditing={submit}
                editable={!busy}
                style={styles.field}
            />

            {error && <AuthErrorText message={t(error)} />}

            <TextButton
                text={busy ? t('auth.login.submitting') : t('auth.login.submit')}
                onPress={submit}
                variant='secondary'
                fullWidth
                disabled={!canSubmit}
                style={styles.submit}
            />

            {/* Under the submit and muted with it: creating an account from nothing is
                the rarer road now — the usual one is playing as a guest first and
                trading up from the profile — so it is offered rather than proposed. */}
            {onSignup !== undefined && (
                <TextButton
                    text={t('auth.login.signupPrompt')}
                    onPress={onSignup}
                    variant='muted'
                    fullWidth
                    disabled={busy}
                    style={styles.signup}
                />
            )}
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
    signup: {
        marginTop: Spacing.three
    }
})
