import AppText from "@/components/text/AppText";
import { Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Children, Fragment, useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, View, type LayoutChangeEvent } from "react-native";

interface Props {
    /** What the card is about, on the header row. */
    title: string,
    /**
     * What is inside it, in one line, shown only while it is shut.
     *
     * The whole reason this can default to shut: a settings card that hides its values
     * behind a chevron makes the host open it to check them, which is worse than the
     * scrolling it saved. A line saying "5 letters · 30s · Normal" does not.
     */
    summary: string,
    /** Starts shut, which is what every caller so far wants. */
    defaultOpen?: boolean,
    /**
     * One block per child, ruled off from one another and from the header.
     *
     * The same shape `SettingsPageBase` uses, and for the same reason: the rows inside
     * are one object being described, not a stack of separate things, and boxing each of
     * them would say the opposite. Nulls and falses drop out, so a section the caller
     * decided not to render takes its rule with it.
     */
    children: ReactNode
}

/** In quicker than out, matching `PopupModal` and `SelectInput`. */
const OPEN_MS = 200;
const CLOSE_MS = 160;

/**
 * A card that keeps its contents folded away until asked.
 *
 * Deliberately not a `Modal` like `SelectInput`: what is in here is a *form*, and the
 * page it is on — a lobby — is one you sit and watch while other people arrive. Covering
 * that to change a setting would hide the thing the screen is for. So it opens in place
 * and pushes the page down instead.
 *
 * The height is measured rather than guessed. Children overflow their parent in React
 * Native rather than being squeezed by it, so the block inside reports its natural height
 * through `onLayout` even while the wrapper around it is clamped to zero — which is what
 * lets the first open animate from a real number on the very first tap.
 */
export default function CollapsibleCard({ title, summary, defaultOpen = false, children }: Props) {
    const styles = useStyles();
    const theme = useTheme();

    const [open, setOpen] = useState(defaultOpen);

    /** The body's natural height, once there has been a layout pass to read it off. */
    const [height, setHeight] = useState<number | null>(null);

    /**
     * Open and no longer moving, at which point the wrapper stops constraining the body
     * at all.
     *
     * Worth the extra state: while it is clamped the wrapper has to clip, and the tiles
     * inside throw hard shadows that paint outside their own box. Left clipped at rest,
     * the chosen word-length tile would lose its shadow against the card's edge.
     */
    const [settled, setSettled] = useState(defaultOpen);

    // 0 is shut, 1 is open. One value drives the height and the chevron, so they cannot
    // drift apart. Lazily constructed — a `new Animated.Value` written straight into the
    // call would be rebuilt every render and thrown away.
    const [motion] = useState(() => new Animated.Value(defaultOpen ? 1 : 0));

    useEffect(() => {
        let cancelled = false;
        let run: Animated.CompositeAnimation | undefined;

        // Checked rather than assumed: someone who has asked the OS for less movement
        // gets the card already open, not a shortened version of the same fold.
        AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
            if (cancelled) return;

            if (reduced) {
                motion.setValue(open ? 1 : 0);
                setSettled(open);
                return;
            }

            run = Animated.timing(motion, {
                toValue: open ? 1 : 0,
                duration: open ? OPEN_MS : CLOSE_MS,
                easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
                // Never true, on any platform. `height` is a layout property, and the
                // native driver only carries opacity and transforms — the rule the rest
                // of the app states as `Platform.OS !== 'web'` does not apply here.
                useNativeDriver: false
            });

            // Interrupted means it was tapped again and the next run owns the card.
            run.start(({ finished }) => { if (finished) setSettled(open); });
        });

        return () => {
            cancelled = true;
            run?.stop();
        };
    }, [open, motion]);

    function toggle() {
        // Dropped before the state flips rather than in the effect, so a card being shut
        // is already clamped to its measured height on the frame the animation starts —
        // from `auto` there would be nothing for it to travel from.
        setSettled(false);
        setOpen(current => !current);
    }

    // Rounded before it is compared as well as before it is used: on web the measurement
    // comes back fractional, and a body that has not moved would otherwise hand back a
    // slightly different number every pass and re-render on each one.
    function measure(event: LayoutChangeEvent) {
        const measured = Math.round(event.nativeEvent.layout.height);

        if (measured !== height) setHeight(measured);
    }

    const sections = Children.toArray(children);

    return (
        <View style={styles.card}>
            <Pressable
                onPress={toggle}
                accessibilityRole='button'
                accessibilityLabel={`${title}: ${summary}`}
                // `aria-expanded` rather than `accessibilityState={{ expanded }}`: the
                // latter never reaches the DOM in this version, so the card would open
                // without announcing that it had.
                aria-expanded={open}
                style={styles.header}
            >
                <View style={styles.headerText}>
                    <AppText style={styles.title}>{title}</AppText>

                    {/* Only while it is shut. Open, the values are on screen in full and
                        a line repeating them would be the same answer twice. */}
                    {!open && (
                        <AppText style={styles.summary} numberOfLines={1}>{summary}</AppText>
                    )}
                </View>

                <Animated.View
                    style={{
                        transform: [{
                            rotate: motion.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '180deg']
                            })
                        }]
                    }}
                >
                    <Feather name='chevron-down' size={20} color={theme.colors.text} />
                </Animated.View>
            </Pressable>

            <Animated.View
                style={settled ? styles.bodyOpen : [
                    styles.body,
                    // Nothing measured yet means this is the first paint of a shut card:
                    // a flat zero, so the form never flashes into view before folding.
                    {
                        height: height === null
                            ? 0
                            : motion.interpolate({ inputRange: [0, 1], outputRange: [0, height] })
                    }
                ]}
            >
                <View style={styles.sections} onLayout={measure}>
                    {sections.map((section, index) => (
                        <Fragment key={index}>
                            {/* A rule above every block, the first included — that one is
                                also the line under the header. */}
                            <View style={styles.divider} />

                            {/* The last block stops short: the card's own padding closes
                                it, and its own would sit on top of that. */}
                            <View
                                style={[
                                    styles.section,
                                    index === sections.length - 1 && styles.sectionLast
                                ]}
                            >
                                {section}
                            </View>
                        </Fragment>
                    ))}
                </View>
            </Animated.View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // The house card, one notch tighter: this is the third thing on a busy screen, and
    // the standing 16pt of padding around a stack of controls reads as slack.
    card: {
        padding: 14,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark' ? {} : theme.popShadow(theme.colors.border))
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three
    },
    // The gap between the header and the first rule lives inside the folding part rather
    // than under the header, so it collapses with everything else: a shut card is then
    // evenly padded, and opening it does not start with a 12pt jump before the travel.
    sections: {
        paddingTop: 12
    },
    headerText: {
        flex: 1,
        minWidth: 0
    },
    title: {
        fontSize: 16,
        fontWeight: 900,
        letterSpacing: -0.4,
        color: theme.colors.text
    },
    summary: {
        marginTop: 3,
        fontSize: 12,
        fontWeight: 600,
        color: theme.colors.textSecondary
    },
    // Clamped and clipping while it moves. See `settled` for why it does not stay that way.
    body: {
        overflow: 'hidden'
    },
    bodyOpen: {
        overflow: 'visible'
    },
    section: {
        paddingVertical: 13
    },
    sectionLast: {
        paddingBottom: 0
    },
    divider: {
        height: 2,
        backgroundColor: theme.scheme === 'dark' ? theme.colors.border : 'rgba(15, 13, 18, 0.12)'
    }
}))
