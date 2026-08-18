import AppText from "@/components/text/AppText";
import { useAuth } from "@/features/auth/useAuth";
import { avatarColorById } from "@/features/settings/profile";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { ROUTES } from "@/constants/routes";
import { Link, RelativePathString } from "expo-router";
import { Pressable, View } from "react-native";

/**
 * Who you are, at the right of the header: a dot in your chosen avatar colour, then your
 * name in caps.
 *
 * Wears the design's context-pill chrome — the same shape the game pages use to say
 * where you are, which is what keeps the corner reading as one slot rather than two
 * unrelated widgets.
 *
 * Renders nothing at all while signed out. A pill with a placeholder name in it would be
 * claiming an identity nobody has yet, and the auth popup is already on screen saying so.
 */
export default function UserPill() {
    const { user } = useAuth();
    const styles = useStyles();

    if (user === null) return null;

    // The swatch the account picked. `avatarColorById` falls back to lemon for an id this
    // build doesn't know, so this is always a real colour.
    const avatar = avatarColorById(user.color);

    return (
        <Link href={ROUTES.profile as RelativePathString} asChild>
            <Pressable
                style={styles.pill}
                accessibilityRole='link'
                accessibilityLabel={`Ingelogd als ${user.name}. Ga naar je profiel.`}
            >
                <View style={[styles.dot, { backgroundColor: avatar.color }]} />

                <AppText style={styles.name} numberOfLines={1}>{user.name}</AppText>
            </Pressable>
        </Link>
    )
}

const useStyles = createThemedStyles(theme => ({
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        paddingVertical: 5,
        paddingHorizontal: 11,
        // The only thing on this row that gives ground when a long name meets a narrow
        // phone — the toggle beside it is a fixed circle.
        flexShrink: 1,
        ...(theme.scheme === 'dark' ? {} : { boxShadow: '2px 2px 0 0 #0F0D12' })
    },
    dot: {
        width: 7,
        height: 7,
        flexShrink: 0,
        borderRadius: 999
    },
    name: {
        flexShrink: 1,
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: theme.colors.text
    }
}))
