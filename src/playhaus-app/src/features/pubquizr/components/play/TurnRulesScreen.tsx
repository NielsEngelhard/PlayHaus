import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import BleedScrollView from "@/components/ui/BleedScrollView";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand, FontSizes, Radii, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import type { ReactNode } from "react";
import { View } from "react-native";

/** One line of the rules card: an icon and the sentence beside it. */
export interface TurnRule {
    icon: keyof typeof Feather.glyphMap
    text: string
}

interface Props {
    /** The `TurnStrip` this round wears, drawn above the card. */
    strip: ReactNode
    /** Whoever is holding the phone and asking. */
    quizmaster: Seat
    /** The one person they are asking, and the only one whose answer counts. */
    guesser: Seat
    rules: TurnRule[]
    /** What the button says, e.g. "Show my words and start". */
    action: string
    /** Somebody the turn cannot start without, and what to say about them. The button waits while this is set. */
    holdBack?: { message: string, seat: Seat } | null
    onStart: () => void
}

// The screen a turn opens on: who is asking, who is answering, and what the round is about to do to them.
export default function TurnRulesScreen({ strip, quizmaster, guesser, rules, action, holdBack = null, onStart }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    return (
        <View style={styles.turn}>
            {strip}

            <BleedScrollView contentContainerStyle={styles.centre}>
                {/* The round's whole shape in one line. */}
                <View style={styles.pairing}>
                    <View style={styles.party}>
                        <View style={[styles.portrait, { backgroundColor: quizmaster.swatch.color }]}>
                            <AppText style={[styles.portraitText, { color: quizmaster.swatch.foreground }]}>
                                {quizmaster.initials}
                            </AppText>
                        </View>

                        <AppText style={styles.partyName} numberOfLines={1}>{quizmaster.name}</AppText>

                        <AppText style={styles.partyRole}>
                            {t('pubquizr.play.turn.roleQuizmaster')}
                        </AppText>
                    </View>

                    <Feather name="arrow-right" size={18} color={theme.colors.textMuted} />

                    <View style={styles.party}>
                        <View style={[styles.portrait, { backgroundColor: guesser.swatch.color }]}>
                            <AppText style={[styles.portraitText, { color: guesser.swatch.foreground }]}>
                                {guesser.initials}
                            </AppText>
                        </View>

                        <AppText style={styles.partyName} numberOfLines={1}>{guesser.name}</AppText>

                        <AppText style={styles.partyRole}>
                            {t('pubquizr.play.turn.roleGuesser')}
                        </AppText>
                    </View>
                </View>

                <View style={styles.rules}>
                    {rules.map((rule, index) => (
                        <View key={index} style={styles.rule}>
                            <View style={styles.ruleIcon}>
                                <Feather name={rule.icon} size={16} color={Brand.ink} />
                            </View>

                            <AppText style={styles.ruleText}>{rule.text}</AppText>
                        </View>
                    ))}
                </View>
            </BleedScrollView>

            {holdBack !== null && (
                <View style={styles.holdBack}>
                    <SeatAvatar seat={holdBack.seat} size={HOLD_BACK_AVATAR} />

                    <AppText style={styles.holdBackText} numberOfLines={2}>{holdBack.message}</AppText>
                </View>
            )}

            <ActionButton size="large" icon="play" text={action} disabled={holdBack !== null} onPress={onStart} />
        </View>
    )
}

const HOLD_BACK_AVATAR = 26;

const useStyles = createThemedStyles(theme => ({
    turn: {
        marginTop: 14,
        flex: 1,
        minHeight: 0,
        gap: 14
    },

    centre: {
        flexGrow: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 22,
        paddingVertical: 4
    },

    // Who is playing whom, said with faces.
    pairing: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        gap: Spacing.three,
        paddingTop: 4
    },

    party: {
        width: 104,
        alignItems: 'center',
        gap: 6
    },

    portrait: {
        width: 52,
        height: 52,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Brand.ink
    },

    portraitText: {
        fontSize: 18,
        fontWeight: 900
    },

    partyName: {
        fontSize: 14,
        fontWeight: 900,
        textAlign: 'center',
        color: theme.colors.text
    },

    partyRole: {
        fontSize: 10,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1,
        textAlign: 'center',
        color: theme.colors.textMuted
    },

    rules: {
        width: '100%',
        maxWidth: 320,
        gap: Spacing.two
    },

    rule: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        padding: Spacing.three,
        borderRadius: Spacing.three,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    ruleIcon: {
        width: 30,
        height: 30,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: theme.colors.mint
    },

    // Lemon in both schemes, so the ink on it reads the same everywhere.
    holdBack: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
        borderRadius: Radii.lg,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon
    },

    holdBackText: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.sm,
        fontWeight: 800,
        color: Brand.ink
    },

    ruleText: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.md,
        fontWeight: 700,
        lineHeight: 13.5 * 1.4,
        color: theme.colors.text
    }
}))
