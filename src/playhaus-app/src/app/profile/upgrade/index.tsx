import LoadingPage from "@/components/layout/LoadingPage";
import AppText from "@/components/text/AppText";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import TextButton from "@/components/ui/TextButton";
import TextField from "@/components/ui/TextField";
import { ROUTES } from "@/constants/routes";
import { FontSizes, Spacing } from "@/constants/theme";
import { upgradeErrorMessage } from "@/features/auth/auth-errors";
import AuthErrorText from "@/features/auth/components/AuthErrorText";
import { useAuth } from "@/features/auth/useAuth";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

/**
 * The backend's own two rules, restated. `upgradeGuestUserRequest.Validate` refuses an
 * email without an `@` and a password under eight characters, and a form that let
 * either through would spend a round trip to be told so in a language of the server's
 * choosing.
 */
const PASSWORD_MIN_LENGTH = 8;

/**
 * Turns the guest you are playing as into a permanent account.
 *
 * A page rather than a step in the auth sheet, which is where creating an account used
 * to live. The sheet is for somebody with no session; this is a thing you do from
 * inside one, deliberately, having decided the account is worth keeping — and the
 * profile is where that decision gets made.
 *
 * No name field: the guest already has one, generated in its own language, and the
 * profile page above is where it gets changed. Only the two things a guest is missing
 * are asked for.
 */
export default function UpgradeAccountPage() {
    const styles = useStyles();
    const t = useT();

    const { user, upgradeGuest } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<TranslationKey | null>(null);

    /**
     * Nothing to upgrade, so nothing to show. Two ways to land here: opening the URL
     * directly on web, and the moment right after a success — `patchUser` flips
     * `isGuest` while this page is still mounted, a render before the replace below
     * takes it off screen.
     *
     * An effect rather than a redirect during render, because navigating is a side
     * effect and expo-router will warn about one fired mid-render.
     */
    useEffect(() => {
        if (user !== null && !user.isGuest) {
            router.replace(ROUTES.profile);
        }
    }, [user]);

    // Below the hooks, so their order never changes. Only while the session is being
    // restored, or once it has ended — the auth gate is already standing over the page
    // in the second case.
    if (user === null) {
        return <LoadingPage message={t('profile.loading')} />;
    }

    // The effect above is on its way to the profile; this is only what fills the frame
    // in between.
    if (!user.isGuest) {
        return <LoadingPage message={t('profile.loading')} />;
    }

    const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

    async function submit() {
        if (!canSubmit) return;

        const trimmedEmail = email.trim();

        // Checked on submit rather than folded into `canSubmit`: a button that stays
        // greyed out until you happen to type an `@` explains nothing.
        if (!trimmedEmail.includes('@')) {
            setError('profile.upgrade.invalidEmail');
            return;
        }
        if (password.length < PASSWORD_MIN_LENGTH) {
            setError('profile.upgrade.shortPassword');
            return;
        }

        setBusy(true);
        setError(null);

        try {
            await upgradeGuest(trimmedEmail, password);

            // Home rather than back to the profile. The notice that sent you here is
            // gone, and landing on the page it used to sit at the top of would be an
            // odd place to celebrate; `replace` because the page you just left belongs
            // to an account state that no longer exists.
            router.replace(ROUTES.home);
        } catch (failure) {
            // The draft survives on purpose: the common failure is an email already in
            // use, and that is a thing to correct rather than retype.
            setError(upgradeErrorMessage(failure));
            setBusy(false);
        }
    }

    return (
        <View style={styles.container}>
            <SimpleTextHero
                title={t('profile.upgrade.title')}
                description={t('profile.upgrade.description')}
            />

            <View>
                <TextField
                    label={t('profile.upgrade.email')}
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t('profile.upgrade.emailPlaceholder')}
                    keyboardType='email-address'
                    autoComplete='email'
                    textContentType='emailAddress'
                    returnKeyType='next'
                    editable={!busy}
                    autoFocus
                />

                <TextField
                    label={t('profile.upgrade.password')}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t('profile.upgrade.passwordPlaceholder')}
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
                    text={busy ? t('profile.upgrade.submitting') : t('profile.upgrade.submit')}
                    onPress={submit}
                    variant='primary'
                    fullWidth
                    disabled={!canSubmit}
                    style={styles.submit}
                />

                <AppText style={styles.hint}>
                    {t('profile.upgrade.note')}
                </AppText>
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        width: '100%',
        gap: Spacing.four
    },
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
