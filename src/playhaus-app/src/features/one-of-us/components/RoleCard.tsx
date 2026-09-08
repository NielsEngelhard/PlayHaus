import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { OneOfUsRole } from "@/features/one-of-us/models";
import { faceOf, revealFaceOf } from "@/features/one-of-us/roles";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View, type StyleProp, type ViewStyle } from "react-native";

interface Props {
    role: OneOfUsRole
    label?: string
    explanation?: string
    style?: StyleProp<ViewStyle>
    // The personal reveal, rather than the briefing or an after-the-fact announcement.
    reveal?: boolean
}

// Which side of the game a player is on, and what that actually asks of them.
export default function RoleCard({ role, label, explanation, style, reveal = false }: Props) {
    const t = useT();
    const styles = useStyles();

    const face = reveal ? revealFaceOf(role) : faceOf(role);

    return (
        <View style={[styles.card, style]}>
            <View style={[styles.spine, { backgroundColor: face.fill }]} />

            <View style={styles.content}>
                <View style={styles.head}>
                    <View style={[styles.badge, { backgroundColor: face.fill }]}>
                        <Feather name={face.icon} size={17} color={Brand.ink} />
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
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // Paper, not the scheme's own card surface.
    card: {
        flexDirection: 'row',
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent,
        overflow: 'hidden',
        ...theme.shadows.hard
    },

    // The role's colour, run down the card's spine rather than across its face.
    spine: {
        width: 10,
        flexShrink: 0,
        borderRightWidth: theme.borderWidth,
        borderRightColor: Brand.ink
    },

    content: {
        flex: 1,
        minWidth: 0,
        paddingVertical: 13,
        paddingHorizontal: 14
    },

    head: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11
    },

    // The fill's own colour rather than ink, now that ink is the spine's job.
    badge: {
        width: 36,
        height: 36,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center'
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
