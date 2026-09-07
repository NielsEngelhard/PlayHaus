import FeatureModeCard from "@/components/ui/FeatureModeCard";
import { Brand, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

/**
 * A knockout between everybody in the lobby, at the top of the multiplayer page.
 *
 * **Nothing behind it yet** — there is no tournament on the API, so pressing it logs and
 * goes nowhere. It is on the page because the shape of the multiplayer page is what is
 * being decided, and one option is not a page to pick from.
 */
export default function TournamentCard() {
    const t = useT();

    return (
        <FeatureModeCard
            fill={Brand.lemon}
            eyebrow={t('lol.modes.multiplayer.tournament.eyebrow')}
            title={t('lol.modes.multiplayer.tournament.title')}
            description={t('lol.modes.multiplayer.tournament.description')}
            panelTone='paper'
            action={t('lol.modes.multiplayer.tournament.action')}
            // TODO: no tournament exists yet.
            onPress={() => console.log('todo')}
        >
            <Bracket />
        </FeatureModeCard>
    )
}

/**
 * Four into two into one, as a picture.
 *
 * Plain views rather than an asset: it is six rounded bars and two rules, it has to
 * follow the card's own ink, and an SVG for it would be a file to keep in step with a
 * palette. Decoration, so it is hidden from a screen reader — the sentence above the
 * panel is what actually says what a tournament is.
 */
function Bracket() {
    const styles = useStyles();

    return (
        <View
            style={styles.bracket}
            accessibilityElementsHidden
            importantForAccessibility='no-hide-descendants'
        >
            <View style={styles.round}>
                <View style={styles.seed} />
                <View style={styles.seed} />
                <View style={styles.seed} />
                <View style={styles.seed} />
            </View>

            <View style={styles.connector} />

            {/* The gap does the work the connecting lines would: each bar of a later round
                sits centred on the pair it came from. */}
            <View style={[styles.round, styles.roundSemi]}>
                <View style={styles.seed} />
                <View style={styles.seed} />
            </View>

            <View style={styles.connector} />

            <View style={[styles.round, styles.roundFinal]}>
                <View style={[styles.seed, styles.winner]} />
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    // Drawn against the card's blush, which does not follow the scheme — so neither may
    // any of this. See `FeatureModeCard`'s `fill`.
    bracket: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },

    round: {
        flex: 1,
        gap: 6
    },
    roundSemi: {
        gap: 24
    },
    roundFinal: {
        justifyContent: 'center'
    },

    seed: {
        height: 16,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent
    },
    // The one that comes out of it, so the eye has somewhere to land.
    winner: {
        backgroundColor: Brand.lemon
    },

    connector: {
        width: 14,
        height: 2,
        flexShrink: 0,
        backgroundColor: withAlpha(Brand.ink, 0.35)
    }
}))
