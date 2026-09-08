import FeatureModeCard from "@/components/ui/FeatureModeCard";
import { Brand, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

// A knockout between everybody in the lobby, at the top of the multiplayer page. **Nothing behind it yet**.
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

// Four into two into one, as a picture.
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

            {/* The gap does the work the connecting lines would: each bar of a later round sits centred on the pair it came from. */}
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
    // Drawn against the card's blush, which does not follow the scheme — so neither may any of this.
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
