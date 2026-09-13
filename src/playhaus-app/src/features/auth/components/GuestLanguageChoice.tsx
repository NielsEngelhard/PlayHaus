import AppText from "@/components/text/AppText";
import LanguageGrid from "@/components/ui/LanguageGrid";
import TextButton from "@/components/ui/TextButton";
import type { LanguageCode } from "@/constants/languages";
import { FontSizes, Spacing } from "@/constants/theme";
import AuthFormHeader from "@/features/auth/components/AuthFormHeader";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    // Left out where this is the first screen, which in the gate it now is.
    onBack?: () => void
    /** The way out for somebody who has an account already. */
    onLogin: () => void
    /** Picking a language moves on to the username step; it does not sign in by itself. */
    onNext: (locale: LanguageCode) => void
}

// The gate's first screen: pick a language, then move on to a username.
export default function GuestLanguageChoice({ onBack, onLogin, onNext }: Props) {
    const styles = useStyles();
    const t = useT();

    return (
        <View>
            <AuthFormHeader title={t('auth.guestLanguage.title')} onBack={onBack} />

            <AppText style={styles.subtitle}>
                {t('auth.guestLanguage.description')}
            </AppText>

            <View style={styles.grid}>
                <LanguageGrid onChange={onNext} />
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
