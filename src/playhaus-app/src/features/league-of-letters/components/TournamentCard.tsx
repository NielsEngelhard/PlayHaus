import AppText from "@/components/text/AppText";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { usePressPop } from "@/components/ui/usePressPop";
import { ROUTES } from "@/constants/routes";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { Link } from "expo-router";
import { StyleSheet, View } from "react-native";

// The bracket: four seeds, two winners, one champion.
const FIRST_ROUND = 4;
const SECOND_ROUND = 2;

// Under the modes: the loudest card on the page, and still the one nobody opens the app to start.
export default function TournamentCard() {
    const styles = useStyles();
    const t = useT();
    const pop = usePressPop();

    const card = (
        <AnimatedPressable
            onPressIn={pop.onPressIn}
            onPressOut={pop.onPressOut}
            onHoverIn={pop.onHoverIn}
            onHoverOut={pop.onHoverOut}
            style={StyleSheet.flatten([styles.card, pop.animatedStyle])}
        >
            <View>
                <AppText style={styles.eyebrow}>{t('lol.index.tournament.badge')}</AppText>

                <AppText style={styles.title}>{t('lol.index.tournament.title')}</AppText>

                <AppText style={styles.description}>{t('lol.index.tournament.description')}</AppText>
            </View>

            <View
                // Decoration.
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.bracket}
            >
                <View style={styles.seeds}>
                    {Array.from({ length: FIRST_ROUND }, (_, index) => (
                        <View key={index} style={styles.slot} />
                    ))}
                </View>

                <View style={styles.connector} />

                <View style={styles.winners}>
                    {Array.from({ length: SECOND_ROUND }, (_, index) => (
                        <View key={index} style={styles.slot} />
                    ))}
                </View>

                <View style={styles.connector} />

                <View style={styles.championColumn}>
                    <View style={[styles.slot, styles.champion]} />
                </View>
            </View>

            <View style={styles.action}>
                <AppText style={styles.actionText}>{t('lol.index.tournament.action')}</AppText>
            </View>
        </AnimatedPressable>
    );

    return (
        <Link href={ROUTES.leagueOfLettersTournament} asChild>
            {card}
        </Link>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        gap: 12,
        padding: 16,
        borderRadius: 24,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.background,
        ...theme.popShadow(theme.colors.shadow)
    },

    eyebrow: {
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: theme.colors.textFaint
    },

    title: {
        marginTop: 2,
        fontSize: 24,
        lineHeight: 24 * 1.05,
        fontWeight: 900,
        letterSpacing: -0.9,
        color: theme.colors.text
    },

    description: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 12 * 1.4,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },

    bracket: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 16,
        // Paper at partial strength in both schemes: the ground under it is the card's own fill, not the page's.
        backgroundColor: Brand.fog
    },

    seeds: {
        flex: 1,
        gap: 6
    },

    winners: {
        flex: 1,
        gap: 24
    },

    championColumn: {
        flex: 1,
        justifyContent: 'center'
    },

    slot: {
        height: 16,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent
    },

    champion: {
        backgroundColor: Brand.lemon
    },

    connector: {
        width: 14,
        height: 2,
        backgroundColor: 'rgba(15, 13, 18, 0.35)'
    },

    action: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 11,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: Brand.ink
    },

    actionText: {
        fontSize: 13.5,
        fontWeight: 900,
        color: Brand.textOnAccent
    }
}))
