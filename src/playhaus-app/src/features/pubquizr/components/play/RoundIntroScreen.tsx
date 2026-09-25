import { usePageTone } from "@/components/layout/PageToneContext";
import AppText from "@/components/text/AppText";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { useEntrance } from "@/components/ui/useEntrance";
import { usePressPop } from "@/components/ui/usePressPop";
import { Brand, FontSizes, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { roundIntroToneFor, type Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { Animated, Easing, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// The two finalist portraits land this far apart, and the "vs" pops in once both have.
const FINALIST_STAGGER_MS = 140;
const FINALIST_ENTER_MS = 320;

const BUTTON_HEIGHT = 64;
const BOTTOM_PADDING = 26;

interface Props {
    round: number
    /** How many rounds the evening has in it, for "of 6" under the number. */
    totalRounds: number
    /** What this round is called, e.g. "Closest guess". */
    kind: string
    /** What the table has to do this round, in the two or three sentences there is room for. */
    brief: string
    // The two players this round is actually between, or null for every round but the finale.
    finalists?: [Seat, Seat] | null
    // Who is reading the finale out, or null for every round but that one.
    quizmaster?: Seat | null
    // Who opens the finale a star up, and null for every round but a finale played for stars.
    bonusNote?: string | null
    onStart: () => void
}

// The screen that opens a round: which round this is, what it is called, and what the table is about to have to do.
export default function RoundIntroScreen({ round, totalRounds, kind, brief, finalists, quizmaster, bonusNote = null, onStart }: Props) {
    const t = useT();
    const styles = useStyles();
    const pop = usePressPop();

    // Nothing above this holds the notch open — the board's band is not drawn on the screens that stand in front of it.
    const insets = useSafeAreaInsets();

    const tone = roundIntroToneFor(round);

    // The window's colour, not just this page's — the same reason the hand-off asks for it.
    usePageTone(tone.fill);

    // Called unconditionally even on rounds with no finalists — harmless, and keeps the hook order fixed.
    const firstEntrance = useEntrance({ durationMs: FINALIST_ENTER_MS, easing: Easing.out(Easing.back(1.6)) });
    const secondEntrance = useEntrance({
        delayMs: FINALIST_STAGGER_MS,
        durationMs: FINALIST_ENTER_MS,
        easing: Easing.out(Easing.back(1.6))
    });
    const versusEntrance = useEntrance({
        delayMs: FINALIST_STAGGER_MS + FINALIST_ENTER_MS,
        durationMs: 240,
        easing: Easing.out(Easing.back(2.2))
    });

    return (
        <View style={[styles.screen, { backgroundColor: tone.fill, paddingTop: insets.top }]}>
            {/* As tall as everything under the body, notch included, so the body sits in the middle of the phone. */}
            <View style={[styles.header, { height: Math.max(0, BUTTON_HEIGHT + BOTTOM_PADDING - insets.top) }]} />

            <View style={styles.body}>
                {/* The number is the headline. */}
                <AppText style={[styles.kicker, { color: tone.muted }]}>
                    {t('pubquizr.play.intro.of', { total: totalRounds })}
                </AppText>

                <AppText style={[styles.number, { color: tone.ink }]}>
                    {t('pubquizr.play.intro.round', { round })}
                </AppText>

                <View style={[styles.rule, { backgroundColor: tone.ink }]} />

                <AppText style={[styles.title, { color: tone.ink }]}>
                    {kind}
                </AppText>

                {/* The finale only. */}
                {finalists !== null && finalists !== undefined && (
                    <View style={styles.finalists}>
                        <Animated.View
                            style={[
                                styles.finalist,
                                {
                                    opacity: firstEntrance,
                                    transform: [{ scale: firstEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }]
                                }
                            ]}
                        >
                            <View style={[styles.portrait, { backgroundColor: finalists[0].swatch.color }]}>
                                <AppText style={[styles.portraitText, { color: finalists[0].swatch.foreground }]}>
                                    {finalists[0].initials}
                                </AppText>
                            </View>

                            <AppText style={[styles.finalistName, { color: tone.ink }]} numberOfLines={1}>
                                {finalists[0].name}
                            </AppText>
                        </Animated.View>

                        <Animated.View
                            style={{
                                opacity: versusEntrance,
                                transform: [{ scale: versusEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }]
                            }}
                        >
                            <AppText style={[styles.versus, { color: tone.muted }]}>
                                {t('pubquizr.play.intro.versus')}
                            </AppText>
                        </Animated.View>

                        <Animated.View
                            style={[
                                styles.finalist,
                                {
                                    opacity: secondEntrance,
                                    transform: [{ scale: secondEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }]
                                }
                            ]}
                        >
                            <View style={[styles.portrait, { backgroundColor: finalists[1].swatch.color }]}>
                                <AppText style={[styles.portraitText, { color: finalists[1].swatch.foreground }]}>
                                    {finalists[1].initials}
                                </AppText>
                            </View>

                            <AppText style={[styles.finalistName, { color: tone.ink }]} numberOfLines={1}>
                                {finalists[1].name}
                            </AppText>
                        </Animated.View>
                    </View>
                )}

                {/* Under the two of them, because it is the answer to the question the portraits have just raised. */}
                {quizmaster !== null && quizmaster !== undefined && (
                    <View style={styles.quizmaster}>
                        <View style={[styles.chip, { backgroundColor: quizmaster.swatch.color }]}>
                            <AppText style={[styles.chipText, { color: quizmaster.swatch.foreground }]}>
                                {quizmaster.initials}
                            </AppText>
                        </View>

                        <AppText style={[styles.quizmasterText, { color: tone.ink }]} numberOfLines={1}>
                            {t('pubquizr.play.intro.quizmaster', { name: quizmaster.name })}
                        </AppText>
                    </View>
                )}

                {bonusNote !== null && (
                    <AppText style={[styles.bonusNote, { color: tone.ink }]}>
                        {bonusNote}
                    </AppText>
                )}

                <AppText style={[styles.brief, { color: tone.muted }]}>
                    {brief}
                </AppText>
            </View>

            <AnimatedPressable
                onPress={onStart}
                onPressIn={pop.onPressIn}
                onPressOut={pop.onPressOut}
                onHoverIn={pop.onHoverIn}
                onHoverOut={pop.onHoverOut}
                accessibilityRole="button"
                style={[styles.button, pop.animatedStyle]}
            >
                <AppText style={styles.buttonText}>
                    {t('pubquizr.play.intro.action', { round })}
                </AppText>

                <Feather name="arrow-right" size={20} color={Brand.textOnAccent} />
            </AnimatedPressable>
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    // The whole of whatever it is handed, exactly as `HandoffScreen` takes it.
    screen: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: Spacing.four + 4,
        paddingBottom: BOTTOM_PADDING
    },

    header: {
        flexShrink: 0
    },

    // Centred in what is left over rather than pinned to the top.
    body: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },

    kicker: {
        fontSize: 11,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        textAlign: 'center'
    },

    number: {
        marginTop: 6,
        fontSize: 52,
        fontWeight: 900,
        lineHeight: 52 * 1.02,
        letterSpacing: -2,
        textAlign: 'center'
    },

    rule: {
        marginTop: 18,
        width: 44,
        height: 3,
        borderRadius: 999
    },

    title: {
        marginTop: 18,
        fontSize: 34,
        fontWeight: 900,
        lineHeight: 34 * 1.05,
        letterSpacing: -1.3,
        textAlign: 'center'
    },

    finalists: {
        marginTop: 22,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16
    },

    finalist: {
        alignItems: 'center',
        width: 84
    },

    // Smaller than the hand-off's own portrait.
    portrait: {
        width: 64,
        height: 64,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Brand.ink,
        boxShadow: '3px 3px 0 0 rgba(15, 13, 18, 1)'
    },

    portraitText: {
        fontSize: 22,
        fontWeight: 900
    },

    finalistName: {
        marginTop: 8,
        fontSize: 13,
        fontWeight: 800,
        textAlign: 'center'
    },

    versus: {
        fontSize: 12,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.4
    },

    // A pill rather than a third portrait.
    quizmaster: {
        marginTop: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        maxWidth: '100%',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: Brand.ink
    },

    chip: {
        width: 26,
        height: 26,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: Brand.ink
    },

    chipText: {
        fontSize: 10,
        fontWeight: 900
    },

    quizmasterText: {
        flexShrink: 1,
        fontSize: 13,
        fontWeight: 800
    },

    // Muted where the name above it is full ink.
    bonusNote: {
        marginTop: Spacing.three,
        maxWidth: 300,
        fontSize: FontSizes.sm,
        fontWeight: 800,
        textAlign: 'center'
    },
    brief: {
        marginTop: 14,
        maxWidth: 300,
        fontSize: 15,
        fontWeight: 600,
        lineHeight: 15 * 1.55,
        textAlign: 'center'
    },

    // Ink fill in every tone, the same as the hand-off's.
    button: {
        width: '100%',
        height: BUTTON_HEIGHT,
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: Brand.ink,
        boxShadow: '4px 4px 0 0 rgba(15, 13, 18, 0.2)'
    },

    buttonText: {
        fontSize: 17,
        fontWeight: 900,
        textAlign: 'center',
        color: Brand.textOnAccent
    }
}))
