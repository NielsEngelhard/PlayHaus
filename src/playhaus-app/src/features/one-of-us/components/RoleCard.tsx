import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { OneOfUsRole } from "@/features/one-of-us/models";
import { faceOf } from "@/features/one-of-us/roles";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View, type StyleProp, type ViewStyle } from "react-native";

interface Props {
    role: OneOfUsRole
    label?: string
    explanation?: string
    style?: StyleProp<ViewStyle>
}

/**
 * Which side of the game a player is on, and what that actually asks of them.
 *
 * A word on its own does not tell you what to do with it. Everybody is handed something
 * that reads like a perfectly ordinary word, and the whole game turns on whether yours
 * is the one the table is talking about — which is precisely the thing a player cannot
 * work out from the word itself. Without this card the imposter's first round is spent
 * discovering they are the imposter, and by then they have already given themselves
 * away. For the nitwit the card is not an aid but the entire hand: it is the only thing
 * they are given.
 *
 * Two callers, and the difference between them is who is reading. On the reveal it is
 * one person learning about themselves, in the second person, ten seconds before they
 * have to act on it. On the briefing it is the whole table learning what is in the box,
 * before anybody has been dealt anything — the same card, the same colours, but nobody
 * in the room is "you" yet. That is what `label` and `explanation` are for; neither
 * caller gets to change how the card looks, only what it says.
 *
 * All three fills are fixed in either scheme, so everything on them is inked rather than
 * themed.
 */
export default function RoleCard({ role, label, explanation, style }: Props) {
    const t = useT();
    const styles = useStyles();

    const face = faceOf(role);

    return (
        <View style={[styles.card, { backgroundColor: face.fill }, style]}>
            <View style={styles.head}>
                <View style={styles.badge}>
                    <Feather name={face.icon} size={17} color={face.fill} />
                </View>

                <View style={styles.naming}>
                    <AppText style={styles.label}>
                        {label ?? t('oneOfUs.play.reveal.role.label')}
                    </AppText>

                    <AppText style={styles.name}>{t(face.name)}</AppText>
                </View>
            </View>

            <AppText style={styles.explanation}>
                {explanation ?? t(face.explanation)}
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
