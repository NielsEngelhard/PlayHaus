import AppText from "@/components/text/AppText";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import { avatarColorById } from "@/features/settings/profile";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

/**
 * Who is about to play, above the mode list.
 *
 * Read-only. It is here to confirm the name that will show up on the board, not to send
 * anyone off to change it mid-decision — the profile tab is where that happens.
 *
 * Renders nothing while signed out, like `UserPill`: there is no name to confirm yet and
 * the auth popup is already saying so.
 */
export default function PlayingAsCard() {
    const { user } = useAuth();
    const styles = useStyles();

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
                    Speelt als {user.name}
                </AppText>
            </View>
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
    }
}))
