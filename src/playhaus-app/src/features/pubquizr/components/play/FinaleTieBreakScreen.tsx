import { usePageTone } from "@/components/layout/PageToneContext";
import AppText from "@/components/text/AppText";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import InlineNotification from "@/components/ui/InlineNotification";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { usePressPop } from "@/components/ui/usePressPop";
import { Brand, FontSizes, Radii, ShadowReach, Spacing } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import type { FinaleTieBreak } from "@/features/pubquizr/round-seven";
import { roundIntroToneFor, type Seat } from "@/features/pubquizr/seats";
import { joinNames } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AVATAR_SIZE = 40;
const BUTTON_HEIGHT = 64;
const RULE_WIDTH = 44;
const RULE_HEIGHT = 3;
const CONTENT_MAX_WIDTH = 420;

interface Props {
    /** The finale's own round number, for the tone it opens in. */
    round: number
    tie: FinaleTieBreak
    /** Who taps the winners in, named on every phone that cannot. */
    quizmaster: Seat | null
    busy?: boolean
    error?: TranslationKey | null
    // Absent on a phone that only watches the draw.
    onConfirm?: (seats: number[]) => void
}

// Before the finale: the players level for a place in it play rock paper scissors, and the quizmaster taps the winners in.
export default function FinaleTieBreakScreen({ round, tie, quizmaster, busy = false, error = null, onConfirm }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();
    const pop = usePressPop();
    const insets = useSafeAreaInsets();

    const tone = roundIntroToneFor(round);
    usePageTone(tone.fill);

    const [picked, setPicked] = useState<number[]>([]);
    const ready = picked.length === tie.places && !busy;

    function toggle(seat: number) {
        if (tie.places === 1) {
            setPicked([seat]);
            return;
        }

        setPicked(current => current.includes(seat)
            ? current.filter(other => other !== seat)
            : current.length < tie.places ? [...current, seat] : current);
    }

    const names = joinNames(tie.tied.map(seat => seat.name), t('common.and'));

    return (
        <View style={[styles.screen, { backgroundColor: tone.fill, paddingTop: insets.top }]}>
            <View style={styles.body}>
                <AppText style={[styles.kicker, { color: tone.muted }]}>
                    {t('pubquizr.play.tieBreak.kicker')}
                </AppText>

                <AppText style={[styles.title, { color: tone.ink }]} accessibilityRole="header">
                    {t('pubquizr.play.tieBreak.title')}
                </AppText>

                <View style={[styles.rule, { backgroundColor: tone.ink }]} />

                <AppText style={[styles.brief, { color: tone.ink }]}>
                    {tie.places === 1
                        ? t('pubquizr.play.tieBreak.bodyOne', { names })
                        : t('pubquizr.play.tieBreak.bodyTwo', { names })}
                </AppText>

                {tie.through.map(seat => (
                    <AppText key={seat.seat} style={[styles.through, { color: tone.muted }]}>
                        {t('pubquizr.play.tieBreak.through', { name: seat.name })}
                    </AppText>
                ))}

                <View style={styles.players}>
                    {tie.tied.map(seat => {
                        const chosen = picked.includes(seat.seat);

                        return (
                            <AnimatedPressable
                                key={seat.seat}
                                onPress={() => toggle(seat.seat)}
                                disabled={onConfirm === undefined || busy}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: chosen }}
                                style={[styles.player, chosen && styles.playerChosen]}
                            >
                                <SeatAvatar seat={seat} size={AVATAR_SIZE} />

                                <AppText
                                    numberOfLines={1}
                                    style={[styles.playerName, chosen && styles.playerNameChosen]}
                                >
                                    {seat.name}
                                </AppText>

                                {chosen && <Feather name="check" size={FontSizes.xl} color={Brand.textOnAccent} />}
                            </AnimatedPressable>
                        )
                    })}
                </View>

                {error !== null && (
                    <InlineNotification icon="alert-triangle" color={theme.colors.blush} message={t(error)} />
                )}
            </View>

            {onConfirm !== undefined ? (
                <AnimatedPressable
                    onPress={() => onConfirm(picked)}
                    onPressIn={pop.onPressIn}
                    onPressOut={pop.onPressOut}
                    onHoverIn={pop.onHoverIn}
                    onHoverOut={pop.onHoverOut}
                    disabled={!ready}
                    accessibilityRole="button"
                    style={[styles.button, !ready && styles.buttonDisabled, pop.animatedStyle]}
                >
                    <AppText style={styles.buttonText}>
                        {tie.places === 1 ? t('pubquizr.play.tieBreak.pickOne') : t('pubquizr.play.tieBreak.pickTwo')}
                    </AppText>

                    <Feather name="arrow-right" size={FontSizes.lg} color={Brand.textOnAccent} />
                </AnimatedPressable>
            ) : (
                <AppText style={[styles.waiting, { color: tone.muted }]}>
                    {t('pubquizr.play.tieBreak.waiting', { name: quizmaster?.name ?? '' })}
                </AppText>
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    screen: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.four
    },

    body: {
        flex: 1,
        width: '100%',
        maxWidth: CONTENT_MAX_WIDTH,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.three
    },

    kicker: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        textAlign: 'center'
    },

    title: {
        fontSize: FontSizes.xxxl,
        fontWeight: 900,
        lineHeight: FontSizes.xxxl * 1.05,
        letterSpacing: -1.3,
        textAlign: 'center'
    },

    rule: {
        width: RULE_WIDTH,
        height: RULE_HEIGHT,
        borderRadius: Radii.full
    },

    brief: {
        fontSize: FontSizes.md,
        fontWeight: 700,
        lineHeight: FontSizes.md * 1.5,
        textAlign: 'center'
    },

    through: {
        fontSize: FontSizes.sm,
        fontWeight: 700,
        textAlign: 'center'
    },

    players: {
        width: '100%',
        gap: Spacing.two
    },

    // Paper on the round's fill, so a row reads as something to press.
    player: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
        borderRadius: Radii.lg,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent,
        boxShadow: `${ShadowReach.hardSmall}px ${ShadowReach.hardSmall}px 0 0 ${Brand.ink}`
    },

    playerChosen: {
        backgroundColor: Brand.ink
    },

    playerName: {
        flex: 1,
        fontSize: FontSizes.lg,
        fontWeight: 900,
        color: Brand.ink
    },

    playerNameChosen: {
        color: Brand.textOnAccent
    },

    button: {
        width: '100%',
        maxWidth: CONTENT_MAX_WIDTH,
        height: BUTTON_HEIGHT,
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        borderRadius: Radii.xl,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.ink
    },

    buttonDisabled: {
        opacity: 0.4
    },

    buttonText: {
        fontSize: FontSizes.lg,
        fontWeight: 900,
        textAlign: 'center',
        color: Brand.textOnAccent
    },

    waiting: {
        fontSize: FontSizes.md,
        fontWeight: 700,
        textAlign: 'center'
    }
}))
