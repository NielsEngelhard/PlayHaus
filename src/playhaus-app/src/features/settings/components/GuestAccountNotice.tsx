import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { useT } from "@/features/i18n/LanguageContext";
import { useTheme } from "@/features/theme/ThemeContext";

interface Props {
    onUpgrade: () => void
}

// What a guest sees at the top of their profile: that this account is temporary, and the one button that fixes it.
export default function GuestAccountNotice({ onUpgrade }: Props) {
    const theme = useTheme();
    const t = useT();

    return (
        <InlineNotification
            title={t('profile.guest.title')}
            icon='alert-triangle'
            color={theme.colors.destructive}
            iconColor={theme.colors.textOnAccent}
            message={t('profile.guest.message')}
        >
            <TextButton
                text={t('profile.guest.action')}
                onPress={onUpgrade}
                variant='primary'
            />
        </InlineNotification>
    )
}
