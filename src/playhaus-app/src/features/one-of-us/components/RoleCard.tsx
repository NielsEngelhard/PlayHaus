import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { OneOfUsRole } from "@/features/one-of-us/models";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View, type StyleProp, type ViewStyle } from "react-native";

interface Props {
    role: OneOfUsRole
    style?: StyleProp<ViewStyle>
}

/**
 * Which side of the game this player is on, and what that actually asks of them.
 *
 * A word on its own does not tell you what to do with it. Everybody is handed something
 * that reads like a perfectly ordinary word, and the whole game turns on whether yours
 * is the one the table is talking about — which is precisely the thing a player cannot
 * work out from the word itself. Without this card the imposter's first round is spent
 * discovering they are the imposter, and by then they have already given themselves
 * away.
 *
 * The explanation is on the card rather than in a rules screen because it is only true
 * of one person and only useful in the ten seconds they are holding the phone. It says
 * what to *do* — bluff, or hunt — not what the role is called.
 *
 * Orange for an imposter and mint for a civilian: the same two colours `EliminationScreen`
 * uses when it says what somebody was, so the colour a player learns about themselves
 * here is the colour they will see again every time somebody goes out. Both fills are
 * fixed in either scheme, so everything on them is inked rather than themed.
 */
export default function RoleCard({ role, style }: Props) {
    const t = useT();
    const styles = useStyles();

    const imposter = role === OneOfUsRole.Imposter;

    return (
        <View style={[styles.card, imposter ? styles.imposter : styles.civilian, style]}>
            <View style={styles.head}>
                <View style={styles.badge}>
                    <Feather
                        name={imposter ? 'zap' : 'users'}
                        size={17}
                        color={imposter ? Brand.primary : Brand.mint}
                    />
                </View>

                <View style={styles.naming}>
                    <AppText style={styles.label}>
                        {t('oneOfUs.play.reveal.role.label')}
                    </AppText>

                    <AppText style={styles.name}>
                        {imposter
                            ? t('oneOfUs.play.reveal.role.imposter.name')
                            : t('oneOfUs.play.reveal.role.civilian.name')}
                    </AppText>
                </View>
            </View>

            <AppText style={styles.explanation}>
                {imposter
                    ? t('oneOfUs.play.reveal.role.imposter.explanation')
                    : t('oneOfUs.play.reveal.role.civilian.explanation')}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        padding: 15,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink
    },

    imposter: {
        backgroundColor: Brand.primary
    },

    civilian: {
        backgroundColor: Brand.mint
    },

    head: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },

    // Ink disc with the fill's own colour inside it, so the badge reads as a hole cut
    // in the card rather than as a second block of paint on top of it.
    badge: {
        width: 36,
        height: 36,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Brand.ink
    },

    naming: {
        flex: 1,
        minWidth: 0
    },

    label: {
        fontSize: 10.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: 'rgba(15, 13, 18, 0.6)'
    },

    name: {
        marginTop: 2,
        fontSize: 22,
        fontWeight: 900,
        letterSpacing: -0.7,
        color: Brand.ink
    },

    explanation: {
        marginTop: 12,
        fontSize: 13.5,
        fontWeight: 600,
        lineHeight: 13.5 * 1.45,
        color: 'rgba(15, 13, 18, 0.78)'
    }
}))
