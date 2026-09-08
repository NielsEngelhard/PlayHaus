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
    // What is inside it, in one line, shown only while it is shut.
    summary: string,
    /** Starts shut, which is what every caller so far wants. */
    defaultOpen?: boolean,
    // One block per child, ruled off from one another and from the header.
    children: ReactNode
}

/** In quicker than out, matching `PopupModal` and `SelectInput`. */
const OPEN_MS = 200;
const CLOSE_MS = 160;

// A card that keeps its contents folded away until asked.
export default function CollapsibleCard({ title, summary, defaultOpen = false, children }: Props) {
    const styles = useStyles();
    const theme = useTheme();

    const [open, setOpen] = useState(defaultOpen);

    /** The body's natural height, once there has been a layout pass to read it off. */
    const [height, setHeight] = useState<number | null>(null);

    // Open and no longer moving, at which point the wrapper stops constraining the body at all.
    const [settled, setSettled] = useState(defaultOpen);

    // 0 is shut, 1 is open.
    const [motion] = useState(() => new Animated.Value(defaultOpen ? 1 : 0));

    useEffect(() => {
        let cancelled = false;
        let run: Animated.CompositeAnimation | undefined;

        // Checked rather than assumed: someone who has asked the OS for less movement gets the card already open, not a shortened version of the same fold.
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
                // Never true, on any platform.
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
        // Dropped before the state flips rather than in the effect.
        setSettled(false);
        setOpen(current => !current);
    }

    // Rounded before it is compared as well as before it is used.
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
                // `aria-expanded` rather than `accessibilityState={{ expanded }}`.
                aria-expanded={open}
                style={styles.header}
            >
                <View style={styles.headerText}>
                    <AppText style={styles.title}>{title}</AppText>

                    {/* Only while it is shut. */}
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
                    // Nothing measured yet means this is the first paint of a shut card.
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
                            {/* A rule above every block, the first included — that one is also the line under the header. */}
                            <View style={styles.divider} />

                            {/* The last block stops short: the card's own padding closes it, and its own would sit on top of that. */}
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
    // The house card, one notch tighter.
    card: {
        padding: 14,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.popShadow(theme.colors.shadow)
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three
    },
    // The gap between the header and the first rule lives inside the folding part rather than under the header, so it collapses with everything else.
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
