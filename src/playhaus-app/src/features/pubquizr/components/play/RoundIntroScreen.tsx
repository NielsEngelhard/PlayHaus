import { usePageTone } from "@/components/layout/PageToneContext";
import AppText from "@/components/text/AppText";
import { Brand, HeaderHeight, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { roundIntroToneFor, type Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, View } from "react-native";

interface Props {
    round: number
    /** How many rounds the evening has in it, for "of 6" under the number. */
    totalRounds: number
    /** What this round is called, e.g. "Closest guess". */
    kind: string
    /** What the table has to do this round, in the two or three sentences there is room for. */
    brief: string
    /**
     * The two players this round is actually between, or null for every round but the
     * finale.
     *
     * Every other round is the whole table, so naming who is playing would be naming
     * everybody — worth nothing. The finale is the one round that has already cut the
     * table down to two before this screen ever opens (see `finaleTurnOf`), and that is
     * the news: the round intro elsewhere in the evening says what the game is about to
     * do, and here what the game is about to do is Alex against Sam.
     */
    finalists?: [Seat, Seat] | null
    /**
     * Who is reading the finale out, or null for every round but that one.
     *
     * The finale is the only round whose quizmaster is not playing it, and the only one
     * where the same person reads every question — so it is the only round where saying
     * who that is in advance is worth a line. Everywhere else the reading moves seat by
     * seat and the hand-off screen names it, one turn at a time.
     */
    quizmaster?: Seat | null
    onStart: () => void
}

/**
 * The screen that opens a round: which round this is, what it is called, and what the
 * table is about to have to do.
 *
 * Every round changes the game — the hot seat becomes four options, then a number
 * everybody guesses, then a stopwatch — and until this screen existed the only place any
 * of that was said was the hand-off, which is read by one person with the phone already
 * in their hand. The table found out what round 3 was by watching somebody play it.
 *
 * Full-bleed for the same reason `HandoffScreen` is, and built the same way: it paints
 * past the page's gutters and up over the header so it reads as a beat in the evening
 * rather than another card in a list. See the note on `screen` there for how it escapes
 * the layout, and `roundIntroToneFor` for why its fill is never the colour of the
 * hand-off that follows it.
 *
 * It stands in front of the very first round too, where there are no standings to come
 * out of — round 1 needs explaining more than any of them do.
 */
export default function RoundIntroScreen({ round, totalRounds, kind, brief, finalists, quizmaster, onStart }: Props) {
    const t = useT();
    const styles = useStyles();

    const tone = roundIntroToneFor(round);

    // The window's colour, not just this page's — the same reason the hand-off asks for
    // it: on a wide window the app's column is 600dp in the middle, and a wall that
    // stops 600dp short reads as a page that has broken.
    usePageTone(tone.fill);

    return (
        <View style={[styles.screen, { backgroundColor: tone.fill }]}>
            <View style={styles.header} />

            <View style={styles.body}>
                {/* The number is the headline. It is the one thing about a round that is
                    the same every quiz, and the table calls rounds by it. */}
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

                {/* The finale only. Every other round is played by the whole table, so
                    there is nobody to single out here — this is the one screen in the
                    evening that gets to say who, because it is the one round where who
                    is the news. */}
                {finalists !== null && finalists !== undefined && (
                    <View style={styles.finalists}>
                        <View style={styles.finalist}>
                            <View style={[styles.portrait, { backgroundColor: finalists[0].swatch.color }]}>
                                <AppText style={[styles.portraitText, { color: finalists[0].swatch.foreground }]}>
                                    {finalists[0].initials}
                                </AppText>
                            </View>

                            <AppText style={[styles.finalistName, { color: tone.ink }]} numberOfLines={1}>
                                {finalists[0].name}
                            </AppText>
                        </View>

                        <AppText style={[styles.versus, { color: tone.muted }]}>
                            {t('pubquizr.play.intro.versus')}
                        </AppText>

                        <View style={styles.finalist}>
                            <View style={[styles.portrait, { backgroundColor: finalists[1].swatch.color }]}>
                                <AppText style={[styles.portraitText, { color: finalists[1].swatch.foreground }]}>
                                    {finalists[1].initials}
                                </AppText>
                            </View>

                            <AppText style={[styles.finalistName, { color: tone.ink }]} numberOfLines={1}>
                                {finalists[1].name}
                            </AppText>
                        </View>
                    </View>
                )}

                {/* Under the two of them, because it is the answer to the question the
                    portraits have just raised: if those two are playing, who is asking?
                    The finale only — see the note on the prop. */}
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

                <AppText style={[styles.brief, { color: tone.muted }]}>
                    {brief}
                </AppText>
            </View>

            <Pressable
                onPress={onStart}
                accessibilityRole="button"
                style={styles.button}
            >
                <AppText style={styles.buttonText}>
                    {t('pubquizr.play.intro.action', { round })}
                </AppText>

                <Feather name="arrow-right" size={20} color={Brand.textOnAccent} />
            </Pressable>
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    /**
     * Painted past the page's gutters and up over the header, exactly as
     * `HandoffScreen` does it — the 24dp inset, the 24dp bottom pad and the 66dp header
     * all belong to `app/_layout.tsx` and no page can reach them, so this pulls back out
     * of all three with negative margins and lays its own padding down inside.
     */
    screen: {
        flex: 1,
        alignItems: 'center',
        marginTop: -HeaderHeight,
        marginHorizontal: -Spacing.four,
        marginBottom: -Spacing.four,
        paddingTop: HeaderHeight,
        paddingHorizontal: Spacing.four + 4,
        paddingBottom: 26
    },

    // Stands in for the header the play screen has, so this frame and the ones either
    // side of it start their content at the same height and the swap does not jump.
    header: {
        height: 58,
        flexShrink: 0
    },

    // Centred in what is left over rather than pinned to the top: there is only one
    // block of text on this screen, and it should sit in the middle of the wall.
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

    // Smaller than the hand-off's own portrait: that screen is about one player, this
    // one is about two of them side by side, and matching its size would crowd them.
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

    // A pill rather than a third portrait: the quizmaster is not in the fight the two
    // faces above are, and drawing them at the same size would say they were.
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

    // Muted where the name above it is full ink: this is the explanation, and the two
    // should not read as the same kind of sentence.
    brief: {
        marginTop: 14,
        maxWidth: 300,
        fontSize: 15,
        fontWeight: 600,
        lineHeight: 15 * 1.55,
        textAlign: 'center'
    },

    // Ink fill in every tone, the same as the hand-off's: it is the one control on the
    // screen, and a button that changed colour with the background would stop being
    // obviously the way out.
    button: {
        width: '100%',
        height: 64,
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
