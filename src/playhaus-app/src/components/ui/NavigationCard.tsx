import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import Tag from "@/components/ui/Tag";
import { FontSizes, Spacing } from "@/constants/theme";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { Link, type Href } from "expo-router";
import { Pressable, View } from "react-native";

interface Props {
    tag: string,
    /** Fill for the badge in the upper right corner. */
    color: string,
    name: string,
    description: string,
    playable: boolean,
    navigationUrl: Href
}

export default function NavigationCard({ tag, color, name, description, playable, navigationUrl }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    return (
        <Link href={navigationUrl} asChild>
            <Pressable>
                <Card triggerOnHoverAnimation>
                    <View style={styles.top}>
                        <View style={styles.heading}>
                            <View style={styles.tagRow}>
                                <Tag text={tag} />
                            </View>

                            <AppText style={styles.name}>{name}</AppText>
                            <AppText style={styles.description}>{description}</AppText>
                        </View>

                        <View style={[styles.badge, { backgroundColor: color }]}>
                            <AppText style={styles.badgeText}>{name[0]}</AppText>
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <View style={styles.status}>
                            <View
                                style={[
                                    styles.dot,
                                    { backgroundColor: playable ? theme.colors.available : theme.colors.textSecondary }
                                ]}
                            />

                            <AppText style={styles.statusText}>
                                {playable ? 'Speelbaar' : 'In de maak'}
                            </AppText>
                        </View>

                        <AppText style={styles.action}>
                            {playable ? 'Spelen' : 'Bekijk'} ↗
                        </AppText>
                    </View>
                </Card>
            </Pressable>
        </Link>
    )
}

const useStyles = createThemedStyles(theme => ({
    top: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: Spacing.three
    },
    heading: {
        flex: 1,
        minWidth: 0
    },
    tagRow: {
        marginBottom: Spacing.three
    },
    name: {
        fontSize: FontSizes.xxl,
        fontWeight: 900,
        lineHeight: FontSizes.xxl * 1.1,
        letterSpacing: -0.6,
        color: theme.colors.text
    },
    description: {
        marginTop: Spacing.two,
        maxWidth: 384,
        fontSize: FontSizes.md,
        lineHeight: FontSizes.md * 1.4,
        color: theme.colors.textSecondary
    },
    badge: {
        width: 56,
        height: 56,
        flexShrink: 0,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.hard
    },
    badgeText: {
        fontSize: FontSizes.xl,
        fontWeight: 900,
        color: theme.colors.textOnAccent
    },
    footer: {
        marginTop: Spacing.four,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    status: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
    statusText: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: theme.colors.text
    },
    action: {
        fontSize: FontSizes.sm,
        fontWeight: 700,
        color: theme.colors.text
    }
}))
