import { useContextPillStyles } from "@/components/layout/ContextPill";
import { useChromeless } from "@/components/layout/FullScreenContext";
import MusicToggle from "@/components/layout/MusicToggle";
import AppText from "@/components/text/AppText";
import JoinCodeBand from "@/components/ui/JoinCodeBand";
import { accentOf, type Game } from "@/constants/games";
import { ContentWidth, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { AccentProvider } from "@/features/theme/AccentContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
    /**
     * Whose room this is. Supplies the band's fill and mark, the join link behind the QR,
     * and the colour the footer's action comes out in.
     */
    game: Game,
    /** The bar's own line: "Your room" for a host, "Lobby ABCD" for a guest. */
    title: string,
    /** Whether this device's socket is open. The pill's dot. */
    live: boolean,
    /**
     * Opens the leave confirm. Never navigates on its own — walking off this screen
     * throws a room away, which is the caller's question to ask.
     */
    onBack: () => void,
    backLabel: string,
    /**
     * The room's code.
     *
     * Always, on every lobby: it is what the room is called, and it rides in the bar so
     * that the band below can be scrolled away without taking the answer to "which room
     * is this" with it.
     */
    code: string,
    /**
     * Whether this screen also hands the code *out* — the band, with the tiles, the QR
     * and the share control.
     *
     * Only the screen that has something to offer draws it. A guest already used their
     * code to get in, so theirs is a reference rather than an offer: the pill in the bar,
     * and the waiting where the band would have been.
     */
    handsOutCode?: boolean,
    /** The scrolling middle: who is here, what the game is set to, anything that failed. */
    children: ReactNode,
    /** Pinned to the bottom edge. The one thing the screen is for. */
    footer: ReactNode
}

/** The design's row: tall enough to clear the notch, short enough to spend on chrome. */
const BAR_HEIGHT = 62;
const CHIP_SIZE = 36;

// react-native-web has no native animation module, so asking for one there is a
// console warning and nothing else. Opacity is driver-safe everywhere else.
const useNativeDriver = Platform.OS !== 'web';

/** Half a breath. The dot fades out over this, then back in over it. */
const PULSE_MS = 1000;

/**
 * The waiting room, whichever game's it is: a bar, the join code on the game's own
 * colour, a scrolling middle and one pinned action.
 *
 * Two fixed things and one that moves. The bar stays because it holds the way out and the
 * mute button; the footer stays because it is what the screen is *for* and it must not be
 * somewhere below the fold when the last player arrives. Everything between them — the
 * code, the seats, the settings — moves, because on a short phone with six seats drawn it
 * has to.
 *
 * The band scrolls with the rest, which is a deliberate change of mind. Pinning it bought
 * a code that could never be scrolled away, at the price of a third of the window spent on
 * four characters for as long as the room is open — and a host reads the code out once, in
 * the first ten seconds, while the seats underneath are what the screen is about for every
 * minute after that. So it is the top of the page rather than a fixture on it.
 *
 * What stays pinned is the code itself, at chrome size, in the bar's pill. Scrolling the
 * band away therefore costs the host the QR and the share button — the things you use once
 * — and not the four characters, which somebody may ask for again at any point.
 *
 * The sibling of `SettingsPageBase`, and now the same arrangement: chromeless, with the
 * app's header given up and what it carried earned back on the page's own bar. A screen
 * with two headers is a screen where neither one is the header, and the lobby had exactly
 * that — the app's row and this bar stacked, with the way out in the lower one. The piece
 * of that header this bar has to keep is the mute button, because a lobby is a screen with
 * music playing that you sit in front of for minutes; it goes on the right, the corner it
 * was already in.
 *
 * A second game's lobby is this component plus its own `Game`, its own seats and its own
 * footer. Nothing in here knows what League of Letters is.
 */
export default function LobbyPageBase({
    game,
    title,
    live,
    onBack,
    backLabel,
    code,
    handsOutCode = false,
    children,
    footer
}: Props) {
    const theme = useTheme();
    const styles = useStyles();

    // Claimed here so a page built on this cannot forget. A page with an early return of
    // its own claims it as well, so the app's chrome does not paint for the length of a
    // load and then leave — see `useChromeless`.
    useChromeless();

    // The app's header used to hold the notch open. Nothing does now but this bar.
    const insets = useSafeAreaInsets();

    /**
     * How far past its own edges the top of the page has to reach to make the window.
     *
     * The page is drawn in the app's one 600dp column, which on a phone is the window and
     * on a desktop window is a strip down the middle of it. A coloured band that stopped
     * where the column does would be a rectangle laid on the page rather than the top of
     * it, so the fill reaches out and the padding puts the contents back — the code and
     * the tiles stay lined up with the seats underneath. `SettingsPageBase` does exactly
     * this with its own header, and the two have to agree.
     *
     * Web only, and the same trade both of those make: a child painting outside its parent
     * is allowed on iOS and clipped on Android, and what keeps the overflow from becoming
     * sideways scroll is the `overflow-x: hidden` a vertical `ScrollView` only has on web.
     * `useWindowDimensions` answers 0 with no DOM to measure, so the pre-rendered export
     * ships the unbled band and hydration widens it.
     */
    const { width: windowWidth } = useWindowDimensions();
    const bleed = Platform.OS === 'web'
        ? Math.max(0, Math.ceil((windowWidth - ContentWidth) / 2))
        : 0;

    /**
     * The reach itself, worn by the bar and the band alike.
     *
     * Both, and not only the coloured one: the rule under the bar sits on top of a fill
     * that runs past it, and a line stopping short of that would read as a mistake rather
     * than as a boundary.
     *
     * The gutters are in here rather than in the stylesheet so there is one place that
     * decides how far these two reach and where their contents sit once they have. A
     * chromeless page is handed no gutters by the root layout — see `useChromeless` — so
     * this is where the 24dp comes from now, rather than being a claw-back of one that was
     * already there.
     */
    const reach = {
        marginHorizontal: -bleed,
        paddingHorizontal: Spacing.four + bleed
    };

    return (
        <View style={styles.screen}>
            <View style={[styles.bar, reach, { height: BAR_HEIGHT + insets.top, paddingTop: insets.top }]}>
                {/*
                  * The way out lives here rather than in the app's header for one reason:
                  * that header's back chip is a `Link`, and here going back deletes a
                  * lobby. A link that did that without asking would be the one control in
                  * the app you cannot middle-click safely, so this has to be a `Pressable`
                  * that opens a question.
                  *
                  * A copy of `BackChip`'s look, for the same reason it is not `BackChip`,
                  * and kept in step with it by hand.
                  */}
                <Pressable
                    onPress={onBack}
                    accessibilityRole='button'
                    accessibilityLabel={backLabel}
                    style={styles.chip}
                >
                    <Feather name='arrow-left' size={17} color={theme.colors.text} />
                </Pressable>

                <AppText style={styles.title} numberOfLines={1}>{title}</AppText>

                <RoomPill code={code} live={live} />

                {/* The one piece of the app's header this page cannot do without. It reads
                    the claimed scene rather than the route, so it appears with the lobby's
                    music and not before — see `MusicToggle`. */}
                <MusicToggle />
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Outside the padded column below it, so the fill still runs edge to
                    edge: the band is the top of the page, it has only stopped being fixed
                    to the top of the window. */}
                {handsOutCode && (
                    <JoinCodeBand game={game} code={code} style={reach} />
                )}

                <View style={styles.content}>{children}</View>
            </ScrollView>

            {/*
              * The game's colour is lent here and nowhere else on the page.
              *
              * Not to `children`, deliberately. In a lobby the pickers keep the lemon they
              * wear everywhere nothing is lent — see the note in `HorizontalButtonSelect`
              * — and the game's own colour is spent on the two things that are about the
              * room rather than about a setting: the band above, and whatever starts it.
              */}
            <AccentProvider accent={accentOf(game)}>
                <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.four }]}>
                    {footer}
                </View>
            </AccentProvider>
        </View>
    )
}

/**
 * Which room this is, and whether it is still listening, in one pill at the right of the
 * bar.
 *
 * The two share a pill because neither earns one alone. The code is four characters, and a
 * frame around four characters next to a frame around one dot is two frames doing the work
 * of one. And the state used to spend a whole word — "Live" — saying the least surprising
 * thing a lobby you are sitting in could tell you; silent while it holds and loud only when
 * it breaks is the right budget for one bit, which is what the dot alone now does.
 *
 * So the dot is the status and the label is the address. A screen reader gets them as two
 * things in that order rather than as one sentence somebody had to compose out of two
 * catalogue entries, which is also why neither of the strings here had to change.
 */
function RoomPill({ code, live }: { code: string, live: boolean }) {
    const t = useT();
    const styles = useStyles();
    const pill = useContextPillStyles();

    return (
        <View style={[pill.pill, styles.roomPill]}>
            <PulseDot
                live={live}
                label={live ? t('lobby.live') : t('lobby.disconnected')}
            />

            <AppText
                style={[pill.label, styles.code]}
                numberOfLines={1}
                accessibilityLabel={t('lobby.codeSpoken', { characters: [...code].join(' ') })}
            >
                {code}
            </AppText>
        </View>
    )
}

/**
 * The dot in the pill: breathing while connected, flat and red once not.
 *
 * It carries the label as well, because it is now the whole of what the pill says about the
 * connection — the word that used to sit beside it is gone.
 */
function PulseDot({ live, label }: { live: boolean, label: string }) {
    const theme = useTheme();
    const pill = useContextPillStyles();

    const [pulse] = useState(() => new Animated.Value(1));

    useEffect(() => {
        // A dropped connection holds still. A dot that kept breathing in red would read
        // as "working on it" at exactly the moment nothing is working.
        if (!live) {
            pulse.setValue(1);
            return;
        }

        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 0.3,
                    duration: PULSE_MS,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver
                }),
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: PULSE_MS,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver
                })
            ])
        );

        loop.start();

        return () => loop.stop();
    }, [live, pulse]);

    return (
        <Animated.View
            accessibilityRole='text'
            accessibilityLabel={label}
            style={[
                pill.dot,
                { backgroundColor: live ? theme.colors.available : theme.colors.destructive },
                { opacity: pulse }
            ]}
        />
    )
}

const useStyles = createThemedStyles(theme => ({
    // Fills the viewport this page claimed, which is what lets the bar and the footer stay
    // put while the middle scrolls between them.
    screen: {
        flex: 1,
        width: '100%'
    },

    /**
     * Everything but the sides and the notch, which are set at the call site — see `reach`
     * and `insets`. The bar pulls out past the column's edges and lays its own padding
     * down inside, so the rule under it runs the full width of the window while the chip,
     * the title and the two controls stay in the column.
     */
    bar: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two + 2,
        borderBottomWidth: theme.borderWidth,
        borderBottomColor: theme.colors.border
    },

    chip: {
        width: CHIP_SIZE,
        height: CHIP_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },
    // The pill's own `flexShrink` is set for a game's name, which can be long. A code is
    // four characters and every one of them matters, so this one holds its width and lets
    // the title beside it give the ground instead.
    roomPill: {
        flexShrink: 0
    },
    // The pill's label, opened up — not to the 2 the guest's footer wears or the 6 the QR
    // panel does, because this is chrome. Far enough apart to stop reading as a word.
    code: {
        letterSpacing: 1.6
    },

    // Takes the room between the chip and the controls, which is also what pushes them to
    // the far edge without either side having to know the other's width.
    title: {
        flex: 1,
        minWidth: 0,
        fontSize: 13.5,
        fontWeight: 900,
        letterSpacing: -0.2,
        color: theme.colors.text
    },

    scroll: {
        width: '100%'
    },
    // The page's gutters, which a chromeless page has to lay down for itself. Around the
    // children only: the band above them runs edge to edge and carries its own.
    content: {
        paddingHorizontal: Spacing.four,
        paddingTop: 18,
        gap: 18,
        // Clears the shadows the cards throw downwards, which paint outside their own box
        // and would otherwise be cropped by the scroller's bottom edge.
        paddingBottom: Spacing.three
    },
    // Outside the scroller, so it is on the bottom edge whatever the page above it does.
    // The bottom padding is set at the call site, from the device's own inset.
    footer: {
        flexShrink: 0,
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.two
    }
}))
