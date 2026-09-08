import AppText from "@/components/text/AppText";
import LanguageGrid from "@/components/ui/LanguageGrid";
import TextButton from "@/components/ui/TextButton";
import type { LanguageCode } from "@/constants/languages";
import { FontSizes, Spacing } from "@/constants/theme";
import { authErrorMessage } from "@/features/auth/auth-errors";
import AuthErrorText from "@/features/auth/components/AuthErrorText";
import AuthFormHeader from "@/features/auth/components/AuthFormHeader";
import { useAuth } from "@/features/auth/useAuth";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useState } from "react";
import { View } from "react-native";

interface Props {
    // Left out where this is the first screen, which in the gate it now is.
    onBack?: () => void
    /** The way out for somebody who has an account already. */
    onLogin: () => void
}

// The gate itself, now: pick a language, and that tap is the sign-in.
export default function GuestLanguageChoice({ onBack, onLogin }: Props) {
    const styles = useStyles();
    const t = useT();

    const { continueAsGuest } = useAuth();

    // The language whose request is in flight, rather than a plain boolean.
    const [pending, setPending] = useState<LanguageCode | null>(null);
    const [error, setError] = useState<TranslationKey | null>(null);

    async function choose(locale: LanguageCode) {
        setPending(locale);
        setError(null);

        try {
            await continueAsGuest(locale);
            // No reset on success: signing in closes the gate and unmounts this view.
        } catch (failure) {
            setError(authErrorMessage(failure));
            setPending(null);
        }
    }

    return (
        <View>
            <AuthFormHeader title={t('auth.guestLanguage.title')} onBack={onBack} disabled={pending !== null} />

            <AppText style={styles.subtitle}>
                {t('auth.guestLanguage.description')}
            </AppText>

            {error && <AuthErrorText message={t(error)} />}

            <View style={styles.grid}>
                <LanguageGrid
                    value={pending ?? undefined}
                    onChange={choose}
                    disabled={pending !== null}
                />
            </View>

            <AppText style={styles.hint}>
                {t('auth.guestLanguage.note')}
            </AppText>

            {/* Muted, and below the note rather than beside the grid. */}
            <TextButton
                text={t('auth.guestLanguage.login')}
                onPress={onLogin}
                variant='primary'
                fullWidth
                disabled={pending !== null}
                style={styles.login}
            />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    subtitle: {
        marginTop: Spacing.four,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: theme.colors.textSecondary
    },
    grid: {
        marginTop: Spacing.four
    },
    hint: {
        marginTop: Spacing.four,
        fontSize: FontSizes.xs,
        lineHeight: FontSizes.xs * 1.45,
        color: theme.colors.textSecondary
    },
    login: {
        marginTop: Spacing.four
    }
}))
