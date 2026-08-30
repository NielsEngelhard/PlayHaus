import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { TranslationKey } from "@/features/i18n/keys";
import { OneOfUsRole } from "@/features/one-of-us/models";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View, type StyleProp, type ViewStyle } from "react-native";

interface Props {
    role: OneOfUsRole
    style?: StyleProp<ViewStyle>
}

/** How one role is dressed: its colour, its mark, and the two lines it is explained in. */
interface RoleFace {
    fill: string
    icon: 'users' | 'zap' | 'help-circle'
    name: TranslationKey
    explanation: TranslationKey
}

/*
 * A table rather than a chain of ternaries, which is what this was while there were two
 * roles and what stopped scaling the moment there were three. Every role has to answer
 * all four questions, so a role added without a face is a compile error here instead of
 * a card that silently draws as a civilian.
 *
 * Orange for an imposter and mint for a civilian are the two colours `EliminationScreen`
 * already uses when it says what somebody was, so the colour a player learns about
 * themselves here is the colour the table will see when they go out. Lemon for the
 * nitwit because it is the third brand hue that carries ink, and because it is the one
 * that does not read as either side — which is about right for somebody who has been
 * put on the imposters' team and handed nothing to do it with.
 */
const FACES: Record<OneOfUsRole, RoleFace> = {
    [OneOfUsRole.Civilian]: {
        fill: Brand.mint,
        icon: 'users',
        name: 'oneOfUs.play.reveal.role.civilian.name',
        explanation: 'oneOfUs.play.reveal.role.civilian.explanation'
    },
    [OneOfUsRole.Imposter]: {
        fill: Brand.primary,
        icon: 'zap',
        name: 'oneOfUs.play.reveal.role.imposter.name',
        explanation: 'oneOfUs.play.reveal.role.imposter.explanation'
    },
    [OneOfUsRole.Nitwit]: {
        fill: Brand.lemon,
        icon: 'help-circle',
        name: 'oneOfUs.play.reveal.role.nitwit.name',
        explanation: 'oneOfUs.play.reveal.role.nitwit.explanation'
    }
};

/**
 * Which side of the game this player is on, and what that actually asks of them.
 *
 * A word on its own does not tell you what to do with it. Everybody is handed something
 * that reads like a perfectly ordinary word, and the whole game turns on whether yours
 * is the one the table is talking about — which is precisely the thing a player cannot
 * work out from the word itself. Without this card the imposter's first round is spent
 * discovering they are the imposter, and by then they have already given themselves
 * away. For the nitwit the card is not an aid but the entire hand: it is the only thing
 * they are given.
 *
 * The explanation is on the card rather than in a rules screen because it is only true
 * of one person and only useful in the ten seconds they are holding the phone. It says
 * what to *do* — bluff, or hunt — not what the role is called.
 *
 * All three fills are fixed in either scheme, so everything on them is inked rather than
 * themed.
 */
export default function RoleCard({ role, style }: Props) {
    const t = useT();
    const styles = useStyles();

    // A game dealt by a newer server than this build knows about would arrive with a
    // role that has no face. Falling back to the civilian's is the quiet failure: it
    // says the wrong thing to one player, where an empty card says nothing to anybody.
    const face = FACES[role] ?? FACES[OneOfUsRole.Civilian];

    return (
        <View style={[styles.card, { backgroundColor: face.fill }, style]}>
            <View style={styles.head}>
                <View style={styles.badge}>
                    <Feather name={face.icon} size={17} color={face.fill} />
                </View>

                <View style={styles.naming}>
                    <AppText style={styles.label}>
                        {t('oneOfUs.play.reveal.role.label')}
                    </AppText>

                    <AppText style={styles.name}>{t(face.name)}</AppText>
                </View>
            </View>

            <AppText style={styles.explanation}>{t(face.explanation)}</AppText>
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
