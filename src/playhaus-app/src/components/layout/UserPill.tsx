import AppText from "@/components/text/AppText";
import { useContextPillStyles } from "@/components/layout/ContextPill";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/useAuth";
import { avatarColorById } from "@/utils/color-utils";
import { useT } from "@/features/i18n/LanguageContext";
import { Link, RelativePathString } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

// Who you are, at the right of the header: a dot in your chosen avatar colour, then your name in caps.
export default function UserPill() {
    const { user } = useAuth();
    const styles = useContextPillStyles();
    const t = useT();

    if (user === null) return null;

    // The swatch the account picked.
    const avatar = avatarColorById(user.color);

    return (
        <Link href={ROUTES.profile as RelativePathString} asChild>
            <Pressable
                // Flattened: `Link asChild` clones this onto the anchor it renders, and a style array does not survive that trip.
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
