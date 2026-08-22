import AppText from "@/components/text/AppText";
import { useContextPillStyles } from "@/components/layout/ContextPill";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/useAuth";
import { avatarColorById } from "@/features/settings/profile";
import { useT } from "@/features/i18n/LanguageContext";
import { Link, RelativePathString } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

/**
 * Who you are, at the right of the header: a dot in your chosen avatar colour, then your
 * name in caps.
 *
 * Wears `ContextPill`'s chrome — the same shape the game pages use to say where you are,
 * which is what keeps the corner reading as one slot rather than two unrelated widgets.
 * Built out of the pieces rather than wrapping the component, because this one is
 * tappable and the border has to belong to the thing that takes the press.
 *
 * Renders nothing at all while signed out. A pill with a placeholder name in it would be
 * claiming an identity nobody has yet, and the auth popup is already on screen saying so.
 */
export default function UserPill() {
    const { user } = useAuth();
    const styles = useContextPillStyles();
    const t = useT();

    if (user === null) return null;

    // The swatch the account picked. `avatarColorById` falls back to lemon for an id this
    // build doesn't know, so this is always a real colour.
    const avatar = avatarColorById(user.color);

    return (
        <Link href={ROUTES.profile as RelativePathString} asChild>
            <Pressable
                // Flattened: `Link asChild` clones this onto the anchor it renders, and a
                // style array does not survive that trip.
                style={StyleSheet.flatten([styles.pill])}
                accessibilityRole='link'
                accessibilityLabel={t('chrome.signedInAs', { name: user.name })}
            >
                <View style={[styles.dot, { backgroundColor: avatar.color }]} />

                <AppText style={styles.label} numberOfLines={1}>{user.name}</AppText>
            </Pressable>
        </Link>
    )
}
