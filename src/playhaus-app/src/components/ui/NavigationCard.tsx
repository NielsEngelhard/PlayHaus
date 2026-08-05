import AppText from "@/components/text/AppText";
import Tag from "@/components/ui/Tag";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

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
    return (
        <Link href={navigationUrl} asChild>
            <Pressable style={styles.card}>
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
                                { backgroundColor: playable ? Colors.light.available : Colors.light.textSecondary }
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
            </Pressable>
        </Link>
    )
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.light.backgroundSecondary,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: Colors.light.border,
        padding: Spacing.four,
        width: '100%',
        ...Shadows.hardLarge
    },
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
        color: Colors.light.text
    },
    description: {
        marginTop: Spacing.two,
        maxWidth: 384,
        fontSize: FontSizes.md,
        lineHeight: FontSizes.md * 1.4,
        color: Colors.light.textSecondary
    },
    badge: {
        width: 56,
        height: 56,
        flexShrink: 0,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: Colors.light.border,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.hard
    },
    badgeText: {
        fontSize: FontSizes.xl,
        fontWeight: 900,
        color: Colors.light.textOnAccent
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
        color: Colors.light.text
    },
    action: {
        fontSize: FontSizes.sm,
        fontWeight: 700,
        color: Colors.light.text
    }
})
