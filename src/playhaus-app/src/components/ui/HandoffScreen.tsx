import { usePageTone } from "@/components/layout/PageToneContext";
import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand, Spacing } from "@/constants/theme";
import { handoffToneFor, type Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Animated, Easing, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
    /** Who has to take the phone. */
    person: Seat
    /** Who is handing it over, or null when nobody has held it yet. */
    from: Seat | null
    /**
     * Which fill this one wears, as a 1-based count of hand-offs.
     *
     * A number rather than the tone itself so two screens cannot pick the same fill by
     * accident, and so the cycling stays one rule in one place. See `handoffToneFor`.
     */
    toneNumber: number
    /** The small uppercase line above the portrait — where in the game this is. */
    step: string
    /** The headline. Usually the name of whoever is taking the phone. */
    title: string
    /** What that person is about to do, in one line. */
    body: string
    /** The rule they need before they start, when the game has one to give. */
    note?: string
    /** The button. Phrasing it as a claim — the person's own name — is the point. */
    action: string
    onReady: () => void
}

/** How far the pair of avatars drifts, and how long one nudge takes. */
const NUDGE = 7;
const NUDGE_MS = 1200;

// react-native-web has no native animation module, so asking for one there is a
// console warning and nothing else. Transforms are driver-safe everywhere else.
const useNativeDriver = Platform.OS !== 'web';

/**
 * The screen between two turns: stop, give the phone to somebody else.
 *
 * A whole screen rather than a banner, and a colour of its own rather than the page's
 * canvas, because it has one job — to be impossible to read past. The next screen has
 * something on it that only one person may see, so the moment the phone changes hands is
 * the moment the game can be spoiled, and a notice that could be scrolled past would
 * eventually be scrolled past. The fill changes every hand-off (see `handoffToneFor`) so
 * that the tenth one still registers as a new screen rather than as the one you just
 * dismissed.
 *
 * It takes the whole window: every board that shows one has claimed the app's chrome
 * already (see `useChromeless`), so there is no header to escape any more and no gutters
 * to reach out of — only, on a window wide enough for the app's column to leave room
 * beside it, the canvas either side. See `usePageTone` below for that.
 *
 * It is drawn instead of the board rather than over it, so the accent band and its way
 * out are gone for as long as this is up. That is the intended reading of a screen whose
 * whole point is "stop here"; tapping through puts the board and its way out back.
 *
 * Every line on it is a prop. This used to live in `features/pubquizr` and look its own
 * copy up, which is exactly what stopped a second game from using it: One of Us hands
 * the phone round to reveal a secret word, a pub quiz hands it round to read questions
 * out, and the shape of the screen is the only thing those two have in common.
 */
export default function HandoffScreen({
    person,
    from,
    toneNumber,
    step,
    title,
    body,
    note,
    action,
    onReady
}: Props) {
    const styles = useStyles();

    // The band that normally holds the notch open is not drawn on this screen — it has
    // no chrome at all — so the wall holds it open itself.
    const insets = useSafeAreaInsets();

    const tone = handoffToneFor(toneNumber);

    // The window's colour, not just this page's. The screen fills the column it is
    // drawn in on its own (see `screen`), and on a phone the column is the window — but
    // on a desktop window the column is 600dp in the middle of it, and a wall that stops
    // 600dp short reads as a page that has broken rather than as a stop sign. This asks
    // the root layout, which does own the window, to paint the rest in the same colour.
    usePageTone(tone.fill);

    // Built once by the lazy initialiser: rebuilding it on a render would drop the
    // nudge back to its start mid-swing.
    const [nudge] = useState(() => new Animated.Value(0));

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(nudge, {
                    toValue: 1,
                    duration: NUDGE_MS / 2,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver
                }),
                Animated.timing(nudge, {
                    toValue: 0,
                    duration: NUDGE_MS / 2,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver
                })
            ])
        );

        animation.start();

        return () => animation.stop();
    }, [nudge]);

    return (
        <View style={[styles.screen, { backgroundColor: tone.fill, paddingTop: insets.top }]}>
            <View style={styles.header} />

            <AppText style={[styles.step, { color: tone.muted }]}>
                {step}
            </AppText>

            <SeatAvatar seat={person} size={132} raised style={styles.portrait} />

            <AppText style={[styles.title, { color: tone.ink }]}>
                {title}
            </AppText>

            <AppText style={[styles.body, { color: tone.muted }]}>
                {body}
            </AppText>

            {/* The rule of the moment, on the one screen with room to say it properly.
                Full-strength ink where the line above it is muted: this is an
                instruction rather than a caption about the hand-off, and the two should
                not read as the same kind of sentence. */}
            {note !== undefined && (
                <AppText style={[styles.rule, { color: tone.ink }]}>
                    {note}
                </AppText>
            )}

            {/* Only when there is somebody to hand over *from*. On the first turn nobody
                has held the phone yet, and an arrow out of an empty circle would be
                saying something that is not true. */}
            {from !== null && (
                <Animated.View
                    style={[
                        styles.pair,
                        {
                            transform: [{
                                translateX: nudge.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, NUDGE]
                                })
                            }]
                        }
                    ]}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                >
                    <SeatAvatar seat={from} size={38} />

                    <Feather name="arrow-right" size={20} color={tone.ink} />

                    {/* The one being handed to is lifted off the page; the one letting
                        go is not. */}
                    <SeatAvatar seat={person} size={38} raised />
                </Animated.View>
            )}

            <Pressable
                onPress={onReady}
                accessibilityRole="button"
                style={styles.button}
            >
                <AppText style={styles.buttonText}>
                    {action}
                </AppText>
            </Pressable>
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    /**
     * The whole of whatever it is handed, plus its own padding inside that.
     *
     * It used to claw its way out of the page's 24dp gutters, its 24dp bottom pad and the
     * 66dp header with three negative margins. None of those are there any more: a board
     * claims the chrome (see `useChromeless`), lays its own gutters down around the parts
     * that want them, and this is drawn outside those — so the wall already starts at the
     * window's edge and only has to pad its own contents in off it.
     *
     * Sideways this reaches the app's own column and no further; the rest of a wide
     * window is painted by the root layout, which is the only thing that can reach it —
     * see `usePageTone` above. The fill stays here as well as there so the two never
     * disagree about which colour this turn is.
     *
     * The top padding is set at the call site, from the device's own inset.
     */
    screen: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: Spacing.four + 4,
        paddingBottom: 26
    },

    // Stands in for the band the play screen has, so the two frames start their content
    // at the same height and the swap does not jump. The notch is not in here: the screen
    // above already pads for it, exactly as the band does.
    header: {
        height: 58,
        flexShrink: 0
    },

    step: {
        marginTop: 60,
        flexShrink: 0,
        fontSize: 11,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        textAlign: 'center'
    },

    portrait: {
        marginTop: 26
    },

    title: {
        marginTop: 26,
        flexShrink: 0,
        fontSize: 38,
        fontWeight: 900,
        lineHeight: 38 * 1.02,
        letterSpacing: -1.5,
        textAlign: 'center'
    },

    body: {
        marginTop: 14,
        maxWidth: 270,
        flexShrink: 0,
        fontSize: 15,
        fontWeight: 600,
        lineHeight: 15 * 1.5,
        textAlign: 'center'
    },

    rule: {
        marginTop: 12,
        maxWidth: 270,
        flexShrink: 0,
        fontSize: 13.5,
        fontWeight: 800,
        lineHeight: 13.5 * 1.45,
        textAlign: 'center'
    },

    pair: {
        marginTop: 22,
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },

    // Ink fill in every tone. It is the one control on the screen, and a button that
    // changed colour with the background would stop being obviously the way out.
    // `marginTop: auto` pins it to the bottom edge, which works because the page has
    // claimed the whole viewport.
    button: {
        marginTop: 'auto',
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
