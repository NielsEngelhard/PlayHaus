import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import Tag from "@/components/ui/Tag";
import { FontSizes, Spacing } from "@/constants/theme";
import { avatarColorById } from "@/features/settings/profile";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    name: string,
    /** A swatch id from `AVATAR_COLORS`, the way the account stores it. */
    color: string
}

/** First two letters of the name, which is all the avatar tile has room for. */
function initials(name: string): string {
    return name.trim().slice(0, 2).toUpperCase();
}

/** The identity card at the top of the profile page: avatar, name, and what that means. */
export default function ProfileCard({ name, color }: Props) {
    const styles = useStyles();

    const avatar = avatarColorById(color);

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
                    <AppText style={styles.subtitle}>Dit ben jij!</AppText>
                </View>
            </View>
        </Card>
    )
}

const useStyles = createThemedStyles(theme => ({
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
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.hardLarge
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
        color: theme.colors.text
    },
    subtitle: {
        marginTop: Spacing.one,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.4,
        color: theme.colors.textSecondary
    }
}))
