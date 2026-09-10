import AppText from "@/components/text/AppText";
import { ROUTES } from "@/constants/routes";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { Link } from "expo-router";
import { Pressable, View } from "react-native";

// The three tones the card's contents wear on blush, in either scheme.
const ON_BLUSH = {
    text: Brand.ink,
    muted: 'rgba(15, 13, 18, 0.7)',
    eyebrow: 'rgba(15, 13, 18, 0.55)'
};

// The bracket: four seeds, two winners, one champion.
const FIRST_ROUND = 4;
const SECOND_ROUND = 2;

// Under the modes: the loudest card on the page, and still the one nobody opens the app to start.
export default function TournamentCard() {
    const styles = useStyles();
    const t = useT();

    const card = (
        <Pressable style={styles.card}>
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
        </Pressable>
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
        backgroundColor: Brand.blush,
        ...theme.popShadow(theme.colors.shadow)
    },

    eyebrow: {
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: ON_BLUSH.eyebrow
    },

    title: {
        marginTop: 2,
        fontSize: 24,
        lineHeight: 24 * 1.05,
        fontWeight: 900,
        letterSpacing: -0.9,
        color: ON_BLUSH.text
    },

    description: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 12 * 1.4,
        fontWeight: 700,
        color: ON_BLUSH.muted
    },

    bracket: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 16,
        // Paper at partial strength in both schemes: the ground under it is the card's own fill, not the page's.
        backgroundColor: 'rgba(255, 255, 255, 0.65)'
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
