import AppText from "@/components/text/AppText";
import TextButton from "@/components/ui/TextButton";
import type { LanguageCode } from "@/constants/languages";
import { FontSizes, Spacing, fontFamilyForWeight } from "@/constants/theme";
import { authErrorMessage } from "@/features/auth/auth-errors";
import AuthErrorText from "@/features/auth/components/AuthErrorText";
import AuthFormHeader from "@/features/auth/components/AuthFormHeader";
import { useAuth } from "@/features/auth/useAuth";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH, randomName } from "@/features/settings/profile";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";

interface Props {
    // Chosen on the screen before this one; the account does not exist until this step submits.
    locale: LanguageCode
    onBack: () => void
}

// Second and last step of the guest gate: pick a name, or take the one already sitting in the field.
export default function GuestUsernameChoice({ locale, onBack }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    const { continueAsGuest } = useAuth();

    const [name, setName] = useState(() => randomName(locale));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<TranslationKey | null>(null);

    const trimmed = name.trim();
    const canSubmit = !busy && trimmed.length >= NAME_MIN_LENGTH && trimmed.length <= NAME_MAX_LENGTH;

    async function submit() {
        if (!canSubmit) return;

        setBusy(true);
        setError(null);

        try {
            await continueAsGuest(locale, trimmed);
            // No reset on success: signing in closes the gate and unmounts this view.
        } catch (failure) {
            setError(authErrorMessage(failure));
            setBusy(false);
        }
    }

    return (
        <View>
            <AuthFormHeader title={t('auth.guestUsername.title')} onBack={onBack} disabled={busy} />

            <AppText style={styles.subtitle}>
                {t('auth.guestUsername.description')}
            </AppText>

            <View style={styles.field}>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    onSubmitEditing={submit}
                    placeholder={t('auth.guestUsername.placeholder')}
                    placeholderTextColor={theme.colors.textSecondary}
                    autoCorrect={false}
                    autoCapitalize='none'
                    editable={!busy}
                    maxLength={NAME_MAX_LENGTH}
                    returnKeyType='go'
                    accessibilityLabel={t('auth.guestUsername.title')}
                    autoFocus
                    style={[styles.input, busy && styles.dimmed]}
                />

                <Pressable
                    onPress={() => setName(randomName(locale))}
                    disabled={busy}
                    accessibilityRole='button'
                    accessibilityLabel={t('auth.guestUsername.random')}
                    style={[styles.diceButton, busy && styles.dimmed]}
                >
                    <Feather name='shuffle' size={20} color={theme.colors.text} />
                </Pressable>
            </View>

            <AppText style={styles.hint}>
                {t('auth.guestUsername.note', { min: NAME_MIN_LENGTH, max: NAME_MAX_LENGTH })}
            </AppText>

            {error && <AuthErrorText message={t(error)} />}

            <TextButton
                text={busy ? t('auth.guestUsername.submitting') : t('auth.guestUsername.submit')}
                onPress={submit}
                variant='primary'
                fullWidth
                disabled={!canSubmit}
                style={styles.submit}
            />
        </View>
    )
}

const BUTTON_HEIGHT = 46;

const useStyles = createThemedStyles(theme => ({
    subtitle: {
        marginTop: Spacing.four,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: theme.colors.textSecondary
    },
    field: {
        marginTop: Spacing.four,
        flexDirection: 'row',
        gap: Spacing.two
    },
    input: {
        flex: 1,
        minWidth: 0,
        height: BUTTON_HEIGHT,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 14,
        backgroundColor: theme.colors.backgroundInput,
        paddingHorizontal: Spacing.three,
        fontSize: FontSizes.lg,
        // A TextInput isn't an `AppText`, so the Outfit family is applied by hand.
        fontFamily: fontFamilyForWeight(700),
        color: theme.colors.text
    },
    diceButton: {
        width: BUTTON_HEIGHT,
        height: BUTTON_HEIGHT,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 14,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hard
    },
    dimmed: {
        opacity: 0.5
    },
    hint: {
        marginTop: Spacing.three,
        fontSize: FontSizes.xs,
        lineHeight: FontSizes.xs * 1.45,
        color: theme.colors.textSecondary
    },
    submit: {
        marginTop: Spacing.four
    }
}))
