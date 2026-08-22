import AppText from "@/components/text/AppText";
import TextButton from "@/components/ui/TextButton";
import TextField from "@/components/ui/TextField";
import { FontSizes, Spacing } from "@/constants/theme";
import { authErrorMessage } from "@/features/auth/auth-errors";
import AuthErrorText from "@/features/auth/components/AuthErrorText";
import AuthFormHeader from "@/features/auth/components/AuthFormHeader";
import { useAuth } from "@/features/auth/useAuth";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import { useState } from "react";
import { View } from "react-native";

interface Props {
    onBack: () => void
    /**
     * Only needed where signing up does not take this form off screen with it.
     * The gate unmounts on its own the moment the session starts; a sheet opened
     * from inside a session — a guest trading up — has to be told to close.
     */
    onSuccess?: () => void
}

/**
 * Creates an account and signs straight into it — one call, since the API
 * answers a signup with a session.
 */
export default function SignupForm({ onBack, onSuccess }: Props) {
    const styles = useStyles();
    const t = useT();

    const { signup } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<TranslationKey | null>(null);

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
            setError('auth.signup.invalidEmail');
            return;
        }

        setBusy(true);
        setError(null);

        try {
            await signup(name.trim(), trimmedEmail, password);
            onSuccess?.();
        } catch (failure) {
            setError(authErrorMessage(failure));
            setBusy(false);
        }
    }

    return (
        <View>
            <AuthFormHeader title={t('auth.signup.title')} onBack={onBack} disabled={busy} />

            <TextField
                label={t('auth.signup.name')}
                value={name}
                onChangeText={setName}
                placeholder={t('auth.signup.namePlaceholder')}
                autoCapitalize='words'
                autoComplete='name'
                textContentType='name'
                returnKeyType='next'
                editable={!busy}
                autoFocus
                style={styles.field}
            />

            <TextField
                label={t('auth.signup.email')}
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.signup.emailPlaceholder')}
                keyboardType='email-address'
                autoComplete='email'
                textContentType='emailAddress'
                returnKeyType='next'
                editable={!busy}
                style={styles.field}
            />

            <TextField
                label={t('auth.signup.password')}
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.signup.passwordPlaceholder')}
                secureTextEntry
                autoComplete='new-password'
                textContentType='newPassword'
                returnKeyType='go'
                onSubmitEditing={submit}
                editable={!busy}
                style={styles.field}
            />

            {error && <AuthErrorText message={t(error)} />}

            <TextButton
                text={busy ? t('auth.signup.submitting') : t('auth.signup.submit')}
                onPress={submit}
                variant='primary'
                fullWidth
                disabled={!canSubmit}
                style={styles.submit}
            />

            <AppText style={styles.hint}>
                {t('auth.signup.nameNote')}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
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
        color: theme.colors.textSecondary
    }
}))
