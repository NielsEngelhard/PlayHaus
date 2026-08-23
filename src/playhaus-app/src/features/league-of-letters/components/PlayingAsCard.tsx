import AppText from "@/components/text/AppText";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import { useT } from "@/features/i18n/LanguageContext";
import { avatarColorById } from "@/features/settings/profile";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { Link, RelativePathString } from "expo-router";
import { View } from "react-native";

/**
 * Who is about to play, above the mode list.
 *
 * Mostly here to confirm the name that will show up on the board, with a quiet way out to
 * the profile for when it is the wrong one. The link is deliberately the smallest thing on
 * the row: changing your name is not what this page is for, but finding out here that it
 * is wrong and having to go looking for the profile tab is worse.
 *
 * Renders nothing while signed out, like `UserPill`: there is no name to confirm yet and
 * the auth popup is already saying so.
 */
export default function PlayingAsCard() {
    const { user } = useAuth();
    const styles = useStyles();
    const t = useT();

    if (user === null) return null;

    const avatar = avatarColorById(user.color);

    return (
        <View style={styles.card}>
            <View style={[styles.avatar, { backgroundColor: avatar.color }]}>
                <AppText style={[styles.initials, { color: avatar.foreground }]}>
                    {initials(user.name)}
                </AppText>
            </View>

            <View style={styles.body}>
                <AppText style={styles.name} numberOfLines={1}>
                    {t('lol.index.playingAs', { name: user.name })}
                </AppText>
            </View>

            <Link href={ROUTES.profile as RelativePathString} accessibilityLabel={t('common.change')}>
                <AppText style={styles.change}>{t('common.change')}</AppText>
            </Link>
        </View>
    )
}

/**
 * The first two characters of a name, as capitals.
 *
 * Spread rather than sliced, so a name that opens with an emoji or any other character
 * outside the basic plane keeps it whole instead of being cut down the middle.
 */
function initials(name: string): string {
    return [...name.trim()].slice(0, 2).join('').toUpperCase();
}

const useStyles = createThemedStyles(theme => ({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 9,
        paddingHorizontal: Spacing.three - 4,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark' ? {} : { boxShadow: '2px 2px 0 0 #0F0D12' })
    },
    avatar: {
        width: 30,
        height: 30,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border
    },
    initials: {
        fontSize: 11,
        fontWeight: 900
    },
    body: {
        flex: 1,
        minWidth: 0
    },
    name: {
        fontSize: 13.5,
        fontWeight: 800,
        color: theme.colors.text
    },
    change: {
        fontSize: 12,
        fontWeight: 700,
        color: theme.colors.focus
    }
}))
