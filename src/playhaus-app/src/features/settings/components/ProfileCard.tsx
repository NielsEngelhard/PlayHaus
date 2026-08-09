import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import Tag from "@/components/ui/Tag";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import { avatarColorById } from "@/features/settings/profile";
import { StyleSheet, View } from "react-native";

interface Props {
    name: string,
    avatarColorId: string
}

/** First two letters of the name, which is all the avatar tile has room for. */
function initials(name: string): string {
    return name.trim().slice(0, 2).toUpperCase();
}

/** The identity card at the top of the profile page: avatar, name, and what that means. */
export default function ProfileCard({ name, avatarColorId }: Props) {
    const avatar = avatarColorById(avatarColorId);

    return (
        <Card>
            <View style={styles.tagRow}>
                <Tag text='Mijn profiel' />
            </View>

            <View style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: avatar.color }]}>
                    <AppText style={[styles.initials, { color: avatar.foreground }]}>
                        {initials(name)}
                    </AppText>
                </View>

                <View style={styles.body}>
                    <AppText numberOfLines={1} style={styles.name}>{name}</AppText>
                    <AppText style={styles.subtitle}>Lokaal opgeslagen. Geen account, geen gedoe.</AppText>
                </View>
            </View>
        </Card>
    )
}

const styles = StyleSheet.create({
    tagRow: {
        marginBottom: Spacing.three
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three
    },
    avatar: {
        width: 80,
        height: 80,
        flexShrink: 0,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: Colors.light.border,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.hardLarge
    },
    initials: {
        fontSize: FontSizes.xl,
        fontWeight: 900
    },
    body: {
        // Without this the name refuses to truncate and pushes the card open.
        flex: 1,
        minWidth: 0
    },
    name: {
        fontSize: FontSizes.xxxl,
        fontWeight: 900,
        lineHeight: FontSizes.xxxl * 1.1,
        letterSpacing: -0.7,
        color: Colors.light.text
    },
    subtitle: {
        marginTop: Spacing.one,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.4,
        color: Colors.light.textSecondary
    }
})
