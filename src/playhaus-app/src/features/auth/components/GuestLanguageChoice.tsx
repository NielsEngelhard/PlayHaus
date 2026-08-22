import AppText from "@/components/text/AppText";
import LanguageGrid from "@/components/ui/LanguageGrid";
import type { LanguageCode } from "@/constants/languages";
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
}

/**
 * The gate's guest step: pick a language, and that tap is the sign-in.
 *
 * There is no confirm button because there is nothing left to confirm — a guest
 * account is a name the backend generates and a language, and the language is the
 * only part anybody chooses. Asking twice for one decision would be a step that
 * only ever gets tapped through.
 *
 * The language is asked here rather than left to the profile screen because the
 * backend builds the guest's display name from that language's word list. Changing
 * the setting afterwards moves the games but leaves the name behind.
 */
export default function GuestLanguageChoice({ onBack }: Props) {
    const styles = useStyles();
    const t = useT();

    const { continueAsGuest } = useAuth();

    /**
     * The language whose request is in flight, rather than a plain boolean: it
     * doubles as the grid's selection, so the tile you tapped stays lit while the
     * account is being made. Back to null on failure, so the choice is re-tappable.
     */
    const [pending, setPending] = useState<LanguageCode | null>(null);
    const [error, setError] = useState<TranslationKey | null>(null);

    async function choose(locale: LanguageCode) {
        setPending(locale);
        setError(null);

        try {
            await continueAsGuest(locale);
            // No reset on success: signing in closes the gate and unmounts this view,
            // and the tiles should stay put for the moment in between.
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
    }
}))
