import { usePageTone } from "@/components/layout/PageToneContext";
import AppText from "@/components/text/AppText";
import { Brand, HeaderHeight, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { roundIntroToneFor } from "@/features/pubquizr/seats";
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
export default function RoundIntroScreen({ round, totalRounds, kind, brief, onStart }: Props) {
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
