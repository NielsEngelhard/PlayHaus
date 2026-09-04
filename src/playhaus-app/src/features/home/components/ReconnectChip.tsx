import AppText from "@/components/text/AppText";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Link, RelativePathString } from "expo-router";
import { Pressable } from "react-native";

/**
 * A quiet way to `/reconnect`, for someone who already has a game open somewhere and
 * would otherwise have no reason to notice the bottom bar's own tab for it.
 *
 * Deliberately just a bordered pill, not a card: this page's cards are for starting
 * something new, and a returning player isn't doing that.
 */
export default function ReconnectChip() {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    return (
        <Link href={ROUTES.reconnect as RelativePathString} asChild>
            <Pressable
                style={styles.chip}
                accessibilityRole='link'
                accessibilityLabel={t('nav.reconnect')}
            >
                <Feather name='wifi' size={13} color={theme.colors.textSecondary} />
                <AppText style={styles.text}>{t('nav.reconnect')}</AppText>
            </Pressable>
        </Link>
    )
}

const useStyles = createThemedStyles(theme => ({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 5,
        borderWidth: 1.5,
        borderColor: theme.colors.borderSubtle,
        borderRadius: 999,
        paddingVertical: 5,
        paddingHorizontal: 11
    },
    text: {
        fontSize: 11.5,
        fontWeight: 800,
        color: theme.colors.textSecondary
    }
}))
