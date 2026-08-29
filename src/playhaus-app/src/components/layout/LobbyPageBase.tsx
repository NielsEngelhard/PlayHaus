import { useContextPillStyles } from "@/components/layout/ContextPill";
import { useFullScreen } from "@/components/layout/FullScreenContext";
import AppText from "@/components/text/AppText";
import JoinCodeBand from "@/components/ui/JoinCodeBand";
import { accentOf, type Game } from "@/constants/games";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { AccentProvider } from "@/features/theme/AccentContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, Platform, Pressable, ScrollView, View } from "react-native";

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
     * The code to hand out, on a slab of the game's colour.
     *
     * Present only on the screen that has something to hand out. A guest already used
     * their code to get in, so their screen draws no band and puts the waiting where it
     * would have been.
     */
    joinCode?: string,
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
 * Three fixed things and one that moves. The bar stays because it holds the way out; the
 * band stays because the code is what a host reads out and must not be scrolled off; the
 * footer stays because it is what the screen is *for* and it must not be somewhere below
 * the fold when the last player arrives. Everything in between — the seats, the settings
 * — moves, because on a short phone with six seats drawn it has to.
 *
 * The sibling of `SettingsPageBase`, and the differences are deliberate. That one is
 * chromeless and carries the app's header on its own band; a lobby keeps the app header,
 * because it is a screen with music playing that you sit in front of for minutes and the
 * mute button has to stay reachable — see the note in `constants/header-context.ts`,
 * which already reserves the header's left slot for exactly this arrangement. So the bar
 * here is a second row under the app's, not a replacement for it.
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
    joinCode,
    children,
    footer
}: Props) {
    const theme = useTheme();
    const styles = useStyles();

    // Claimed here so a page built on this cannot forget. A page with an early return of
    // its own claims it as well, so the app's bottom bar does not paint for the length of
    // a load and then leave — see `useFullScreen`.
    useFullScreen();

    return (
        <View style={styles.screen}>
            <View style={styles.bar}>
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

                <LivePill live={live} />
            </View>

            {joinCode !== undefined && (
                <JoinCodeBand game={game} code={joinCode} style={styles.band} />
            )}

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {children}
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
                <View style={styles.footer}>{footer}</View>
            </AccentProvider>
        </View>
    )
}

/**
 * Whether this device is still listening, in the corner of the bar.
 *
 * Worth a pill of its own on both screens, though for different reasons: a guest is
 * waiting for something that will happen on somebody else's phone, and a host is about to
 * start a game on a socket that has to be up. Either way it is the one thing this screen
 * can tell you about itself.
 */
function LivePill({ live }: { live: boolean }) {
    const t = useT();
    const pill = useContextPillStyles();

    return (
        <View
            style={pill.pill}
            accessibilityRole='text'
            accessibilityLabel={live ? t('lobby.live') : t('lobby.disconnected')}
        >
            <PulseDot live={live} />

            <AppText style={pill.label} numberOfLines={1}>
                {live ? t('lobby.live') : t('lobby.offline')}
            </AppText>
        </View>
    )
}

/** The dot in the pill: breathing while connected, flat and red once not. */
function PulseDot({ live }: { live: boolean }) {
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
            style={[
                pill.dot,
                { backgroundColor: live ? theme.colors.available : theme.colors.destructive },
                { opacity: pulse }
            ]}
        />
    )
}

const useStyles = createThemedStyles(theme => ({
    // Fills the viewport this page claimed, which is what lets the bar, the band and the
    // footer stay put while the middle scrolls between them.
    screen: {
        flex: 1,
        width: '100%'
    },

    /**
     * The bar and the band both reach back out into the root scroller's gutters.
     *
     * Those 24dp belong to the one scroller in `app/_layout.tsx` and no page can reach
     * them, so these pull out with a negative margin and lay their own padding down
     * inside — the same trick `GameIndexPage`'s hero band plays. The line under the bar
     * and the colour under that then run edge to edge, as the design has them, while
     * everything on them stays in the column.
     *
     * Only to the column's edges and not to the window's: a lobby is a phone-shaped
     * screen you hold up to a table, not a landing hero.
     */
    bar: {
        height: BAR_HEIGHT,
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two + 2,
        marginHorizontal: -Spacing.four,
        paddingHorizontal: Spacing.four,
        borderBottomWidth: theme.borderWidth,
        borderBottomColor: theme.colors.border
    },
    band: {
        marginHorizontal: -Spacing.four
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
        ...(theme.scheme === 'dark' ? {} : { boxShadow: '2px 2px 0 0 #0F0D12' })
    },
    // Takes the room between the chip and the pill, which is also what pushes the pill to
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
    content: {
        paddingTop: 18,
        gap: 18,
        // Clears the shadows the cards throw downwards, which paint outside their own box
        // and would otherwise be cropped by the scroller's bottom edge.
        paddingBottom: Spacing.three
    },
    footer: {
        flexShrink: 0,
        paddingTop: Spacing.two
    }
}))
